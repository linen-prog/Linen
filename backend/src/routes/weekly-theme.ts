import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Utility function to get current Monday (week start) in Pacific Time
function getCurrentMondayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);

  // Calculate days to go back to Monday
  // If Sunday (0), go back 6 days. If Monday (1), no change. If Tuesday (2), go back 1 day, etc.
  const daysBack = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysBack);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

// Get next Sunday in Pacific Time
function getNextSundayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

// Calculate which day of the year (0-364) it is in Pacific Time
function getDayOfYear(): number {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const year = pacificTime.getFullYear();
  const month = pacificTime.getMonth();
  const day = pacificTime.getDate();

  // Create startOfYear in Pacific Time to ensure correct calculation
  const startOfYearStr = new Date(year, 0, 1).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const startOfYear = new Date(startOfYearStr);

  // Calculate days since start of year
  const diff = pacificTime.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  return dayOfYear; // 0 = Jan 1, 364 = Dec 31
}

// Calculate which week (0-51) of the 52-week liturgical cycle we're in
function getCurrentWeekIndex(): number {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const currentMonth = pacificTime.getMonth(); // 0-11
  const currentDay = pacificTime.getDate();

  // Calculate which week of the year we're in to determine week index
  // Array structure:
  // 0-3: Advent (4 weeks)
  // 4-5: Christmas (2 weeks)
  // 6-7: Epiphany (2 weeks)
  // 8-9: Ordinary Time early (2 weeks) - LATE JANUARY/EARLY FEBRUARY
  // 10-15: Lent (6 weeks)
  // 16-21: Easter (6 weeks)
  // 22-43: Ordinary Time mid (22 weeks)
  // 44-50: Thanksgiving/Advent prep (7 weeks)
  // 51: Final week before Advent cycle restarts
  let weekIndex = 0;

  // Late January (after Epiphany on Jan 6, Epiphany II is Jan 13-19, then Ordinary Time begins ~Jan 20)
  if (currentMonth === 0 && currentDay > 19) {
    weekIndex = 8; // Ordinary Time begins (index 8 = "The Everyday Sacred")
  } else if (currentMonth === 1) {
    // February - weeks 8-9 of Ordinary Time early
    if (currentDay < 15) {
      weekIndex = 8; // Still in first Ordinary Time week
    } else {
      weekIndex = 9; // Second Ordinary Time week
    }
  } else if (currentMonth === 2) {
    // March - weeks 10-15, Lent
    weekIndex = 10;
  } else if (currentMonth === 3) {
    // April - weeks 16-21, Easter
    weekIndex = 16;
  } else if (currentMonth === 4) {
    // May - weeks 22-24, Ordinary Time continues
    weekIndex = 22;
  } else if (currentMonth > 4 && currentMonth < 11) {
    // June-October - Ordinary Time continues (weeks 22-43)
    const weekOfYear = Math.floor((currentDay + 30 * currentMonth) / 7) - 8;
    weekIndex = Math.max(22, Math.min(43, weekOfYear));
  } else if (currentMonth === 10) {
    // November - weeks 44-47, Thanksgiving/Ordinary Time tail
    weekIndex = 44;
  } else if (currentMonth === 11) {
    // December - weeks 48-51, Advent begins (around Dec 1-2)
    if (currentDay < 5) {
      weekIndex = 47; // Late Thanksgiving
    } else {
      weekIndex = 48; // Advent begins
    }
  }

  return weekIndex;
}

// 365 unique daily scriptures (one for each day of the year)
const DAILY_SCRIPTURES_365 = [
  // January (Days 0-30)
  { ref: 'Psalm 23:1-3', text: 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.', prompt: 'Where is your shepherd leading you?' },
  { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.', prompt: 'What burden can you lay down?' },
  { ref: 'Psalm 46:10', text: 'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.', prompt: 'How do you practice stillness?' },
  { ref: 'Psalm 145:18', text: 'The Lord is near to all who call on him, to all who call on him in truth.', prompt: 'How near do you feel to God?' },
  { ref: '1 Peter 5:7', text: 'Cast all your anxiety on him because he cares for you.', prompt: 'What anxiety are you releasing?' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', prompt: 'Do you trust God\'s plans?' },
  { ref: 'Lamentations 3:22-23', text: 'Because of the Lord\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.', prompt: 'What newness is God offering?' },
  { ref: 'Psalm 3:3-5', text: 'But you, Lord, are a shield around me, my glory, the One who lifts my head high. I call out to the Lord, and he answers me from his holy mountain.', prompt: 'What protection do you need?' },
  { ref: 'Isaiah 40:31', text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', prompt: 'Where does your strength come from?' },
  { ref: 'Psalm 84:10', text: 'Better is one day in your courts than a thousand elsewhere; I would rather be a doorkeeper in the house of my God than dwell in the tents of the wicked.', prompt: 'What is your greatest treasure?' },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', prompt: 'How do you submit to God?' },
  { ref: 'Psalm 27:1', text: 'The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?', prompt: 'What fear can light overcome?' },
  { ref: 'John 14:27', text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.', prompt: 'What peace does Christ offer?' },
  { ref: 'Psalm 91:1-2', text: 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, "He is my refuge and my fortress, my God, in whom I trust."', prompt: 'Where do you find shelter?' },
  { ref: 'Philippians 4:6-7', text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', prompt: 'What petition will you bring?' },
  { ref: 'Psalm 42:1-2', text: 'As the deer pants for streams of water, so my soul pants for you, my God. My soul thirsts for God, for the living God.', prompt: 'What does your soul thirst for?' },
  { ref: 'Isaiah 43:1', text: 'But now, this is what the Lord says—he who created you, Jacob, he who formed you, Israel: "Fear not, for I have redeemed you; I have summoned you by name; you are mine."', prompt: 'Does God know you by name?' },
  { ref: 'Psalm 139:1-3', text: 'You have searched me, Lord, and you know me. You know when I sit and when I rise; you perceive my thoughts from afar. You discern my going out and my lying down; you are familiar with all my ways.', prompt: 'What does it mean to be fully known?' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', prompt: 'How have you seen good from difficulty?' },
  { ref: 'Psalm 31:14-15', text: 'But I trust in you, Lord; I say, "You are my God." My times are in your hands; deliver me from the hands of my enemies, from those who pursue me.', prompt: 'Can you trust your times to God?' },
  { ref: 'Proverbs 8:11', text: 'For wisdom is more precious than rubies, and nothing you desire can compare with her.', prompt: 'What wisdom are you seeking?' },
  { ref: 'Psalm 40:1-3', text: 'I waited patiently for the Lord; he turned to me and heard my cry... He put a new song in my mouth, a hymn of praise to our God.', prompt: 'What new song is God singing?' },
  { ref: 'Deuteronomy 31:8', text: 'The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged.', prompt: 'Where do you feel abandoned?' },
  { ref: 'Psalm 63:1', text: 'You, God, are my God, earnestly I seek you; I thirst for you, my whole being longs for you, in a dry and parched land where there is no water.', prompt: 'How do you earnestly seek God?' },
  { ref: 'Colossians 3:16', text: 'Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit, singing to God with gratitude in your hearts.', prompt: 'What message shapes your life?' },
  { ref: 'Psalm 121:1-2', text: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.', prompt: 'Where is your help coming from?' },
  { ref: 'Ephesians 3:17-19', text: 'So that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power, together with all the Lord\'s holy people, to grasp how wide and long and high and deep is the love of Christ.', prompt: 'How deep is Christ\'s love?' },
  { ref: 'Psalm 18:28-29', text: 'You, Lord, keep my lamp burning; my God turns my darkness into light. With your help I can advance against a troop; with my God I can scale a wall.', prompt: 'What darkness needs light?' },
  { ref: '2 Corinthians 12:9', text: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Therefore I will boast all the more gladly about my weaknesses, so that Christ\'s power may rest on me.', prompt: 'How is grace sufficient?' },
  { ref: 'Psalm 32:7', text: 'You are my hiding place; you will protect me from trouble and surround me with songs of deliverance.', prompt: 'What songs surround you?' },
  { ref: 'Hebrews 11:1', text: 'Now faith is confidence in what we hope for and assurance about what we do not see.', prompt: 'What are you hoping for?' },

  // February (Days 31-58)
  { ref: 'Psalm 113:1-2', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Let the name of the Lord be praised, both now and forevermore.', prompt: 'What causes you to praise?' },
  { ref: 'Genesis 28:15', text: 'I am with you and will watch over you wherever you go, and I will bring you back to this land. I will not leave you until I have done what I have promised you.', prompt: 'Does God\'s promise comfort you?' },
  { ref: 'Psalm 34:8', text: 'Taste and see that the Lord is good; blessed is the one who takes refuge in him.', prompt: 'How do you taste God\'s goodness?' },
  { ref: 'Proverbs 14:12', text: 'There is a way that appears to be right, but in the end it leads to death.', prompt: 'How do you discern the right path?' },
  { ref: 'Psalm 47:1', text: 'Clap your hands, all you nations; shout to God with cries of joy.', prompt: 'What joy bubbles up in you?' },
  { ref: 'Matthew 7:24-25', text: 'Therefore everyone who hears these words of mine and puts them into practice is like a wise man who built his house on the rock. The rain came down, the streams rose, and the winds blew and beat against that house; yet it did not fall, because it had its foundation on the rock.', prompt: 'What foundation are you building on?' },
  { ref: 'Psalm 78:4', text: 'We will tell the next generation the praiseworthy deeds of the Lord, his power, and the wonders he has done.', prompt: 'What will you pass on?' },
  { ref: 'Ecclesiastes 3:1', text: 'There is a time for everything, and a season for every activity under the heavens.', prompt: 'What season are you in?' },
  { ref: 'Psalm 100:1-2', text: 'Shout for joy to the Lord, all the earth. Worship the Lord with gladness; come before him with joyful songs.', prompt: 'How do you come before God?' },
  { ref: 'Song of Solomon 2:11-13', text: 'See! The winter is past; the rains are over and gone. Flowers appear on the earth; the season of singing has come, the cooing of doves is heard in our land.', prompt: 'What season is changing?' },
  { ref: 'Psalm 119:105', text: 'Your word is a lamp to my feet and a light to my path.', prompt: 'How does God\'s word illuminate?' },
  { ref: 'Luke 12:6-7', text: 'Are not five sparrows sold for two pennies? Yet not one of them is forgotten by God. Indeed, the very hairs of your head are all numbered. Don\'t be afraid; you are worth more than many sparrows.', prompt: 'How are you valued?' },
  { ref: 'Psalm 136:1', text: 'Give thanks to the Lord, for he is good. His love endures forever.', prompt: 'What love endures?' },
  { ref: 'Isaiah 49:15-16', text: 'Can a mother forget the baby at her breast and have no compassion on the child she has borne? Though she may forget, I will not forget you! See, I have engraved you on the palms of my hands.', prompt: 'Do you believe you\'re engraved on God\'s hands?' },
  { ref: 'Psalm 23:6', text: 'Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the Lord forever.', prompt: 'What goodness follows you?' },
  { ref: 'Job 23:10', text: 'But he knows the way that I take; when he has tested me, I will come forth as gold.', prompt: 'What refining is God doing?' },
  { ref: 'Psalm 25:4-5', text: 'Show me your ways, Lord, teach me your paths. Guide me in your truth and teach me, for you are God my Savior, and my hope is in you all day long.', prompt: 'What path is God showing you?' },
  { ref: 'Proverbs 27:1', text: 'Do not boast about tomorrow, for you do not know what a day may bring.', prompt: 'How do you trust the unknown?' },
  { ref: 'Psalm 29:11', text: 'The Lord gives strength to his people; the Lord blesses his people with peace.', prompt: 'What strength and peace do you need?' },
  { ref: 'Romans 5:1', text: 'Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ.', prompt: 'What peace have you found?' },
  { ref: 'Psalm 37:4', text: 'Take delight in the Lord, and he will give you the desires of your heart.', prompt: 'What does your heart desire?' },
  { ref: 'Micah 7:18', text: 'Who is a God like you, who pardons sin and forgives the transgression of the remnant of his inheritance? You do not stay angry forever but delight to show mercy.', prompt: 'How has God shown mercy?' },
  { ref: 'Psalm 50:15', text: 'And call on me in the day of trouble; I will deliver you, and you will honor me.', prompt: 'What trouble can you bring to God?' },
  { ref: 'Nahum 1:7', text: 'The Lord is good, a refuge in times of trouble. He cares for those who trust in him.', prompt: 'What refuge do you seek?' },
  { ref: 'Psalm 57:1', text: 'Have mercy on me, my God, have mercy on me, for in you I take refuge. I will take refuge in the shadow of your wings until the disaster has passed.', prompt: 'What shadow provides shelter?' },
  { ref: 'Proverbs 9:10', text: 'The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding.', prompt: 'How do you approach God with reverence?' },
  { ref: 'Psalm 77:11-12', text: 'I will remember the deeds of the Lord; yes, I will remember your miracles of long ago. I will consider all your works and meditate on all your mighty deeds.', prompt: 'What miracles has God done?' },
  { ref: 'Luke 6:35', text: 'But love your enemies, do good to them, and lend to them without expecting to get anything back. Then your reward will be great, and you will be children of the Most High.', prompt: 'How do you love your enemies?' },

  // March (Days 59-89)
  { ref: 'Psalm 51:1-2', text: 'Have mercy on me, O God, according to your unfailing love; according to your great compassion blot out my transgressions. Wash away all my iniquity and cleanse me from my sin.', prompt: 'What needs washing?' },
  { ref: 'Joel 2:13', text: 'Rend your heart and not your garments. Return to the Lord your God, for he is gracious and compassionate, slow to anger and abounding in love.', prompt: 'What return to God is calling?' },
  { ref: 'Psalm 6:9', text: 'Away from me, all you who do evil, for the Lord has heard my weeping.', prompt: 'What sorrow are you naming?' },
  { ref: 'Isaiah 58:6', text: 'Is not this the kind of fasting I have chosen: to loose the chains of injustice and untie the cords of the yoke, to set the oppressed free and break every yoke?', prompt: 'What chains need breaking?' },
  { ref: 'Psalm 5:1-3', text: 'Listen to my words, Lord, consider my lament. Hear my cry for help, my King and my God, for to you I pray.', prompt: 'What cry are you bringing?' },
  { ref: 'Deuteronomy 30:15-16', text: 'See, I set before you today life and good, death and evil... Choose life, that you and your offspring may live.', prompt: 'What choice are you making?' },
  { ref: 'Psalm 119:9-11', text: 'How can a young person stay on the path of purity? By living according to your word... I have hidden your word in my heart that I might not sin against you.', prompt: 'What word are you hiding?' },
  { ref: 'Matthew 6:1-4', text: '"Be careful not to practice your righteousness in front of others to be seen by them... But when you give to the needy, do not let your left hand know what your right hand is doing."', prompt: 'How do you serve secretly?' },
  { ref: 'Psalm 38:21-22', text: 'Do not forsake me, Lord; be not far from me, my God. Come quickly to help me, my Lord and my Savior.', prompt: 'Where do you feel far from God?' },
  { ref: 'Mark 1:35', text: 'Very early in the morning, while it was still dark, Jesus got up, left the house and went off to a solitary place, where he prayed.', prompt: 'How do you carve out solitude?' },
  { ref: 'Psalm 42:5', text: 'Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God, for I will yet praise him, my Savior and my God.', prompt: 'What downcasting hope can lift?' },
  { ref: 'Romans 6:9', text: 'For we know that Christ, being raised from the dead, dies no more. Death no longer has dominion over him.', prompt: 'What death are you overcoming?' },
  { ref: 'Psalm 102:28', text: 'The children of your servants will live in your presence; their descendants will be established before you.', prompt: 'What legacy are you leaving?' },
  { ref: 'Luke 15:11-32', text: 'Jesus continued: "There was a man who had two sons... But the father said to his servants, \'Quick! Bring the best robe and put it on him.\'"', prompt: 'Where have you been lost?' },
  { ref: 'Psalm 130:1-4', text: 'Out of the depths I cry to you, Lord; Lord, hear my voice... But with you there is forgiveness.', prompt: 'What depth is calling out?' },
  { ref: 'Isaiah 1:18', text: '"Come now, let us settle the matter," says the Lord. "Though your sins are like scarlet, they shall be as white as snow; though they are red as crimson, they shall be like wool."', prompt: 'What cleansing are you needing?' },
  { ref: 'Psalm 86:5', text: 'You, Lord, are forgiving and good, abounding in love to all who call to you.', prompt: 'How does God\'s forgiveness show?' },
  { ref: 'Matthew 26:39', text: '"My Father, if it is possible, may this cup be taken from me. Yet not as I will, but as you will."', prompt: 'What surrender is being asked?' },
  { ref: 'Psalm 22:1', text: 'My God, my God, why have you forsaken me? Why are you so far from saving me, so far from my cries of anguish?', prompt: 'Where do you feel abandoned?' },
  { ref: 'Lamentations 3:32-33', text: 'Though he brings grief, he will show compassion, so great is his unfailing love. For he does not willingly bring affliction or grief to anyone.', prompt: 'What grief is bringing growth?' },
  { ref: 'Psalm 25:8-9', text: 'Good and upright is the Lord; therefore he instructs sinners in his ways. He guides the humble in what is right and teaches them his way.', prompt: 'How are you being guided?' },
  { ref: 'John 11:35', text: 'Jesus wept.', prompt: 'What moves you to tears?' },
  { ref: 'Psalm 31:9-10', text: 'Be merciful to me, Lord, for I am in distress; my eyes grow weak with sorrow, my soul and body with anguish.', prompt: 'What distress are you carrying?' },
  { ref: 'Hosea 6:1', text: '"Come, let us return to the Lord. He has torn us to pieces but he will heal us; he has injured us but he will bind up our wounds."', prompt: 'What wounds need binding?' },
  { ref: 'Psalm 13:5-6', text: 'But I trust in your unfailing love; my heart rejoices in your salvation. I will sing the Lord\'s praise, for he has been good to me.', prompt: 'What salvation do you celebrate?' },
  { ref: 'Jeremiah 31:3', text: '"I have loved you with an everlasting love; I have drawn you with unfailing kindness."', prompt: 'How has God drawn you?' },
  { ref: 'Psalm 88:1', text: 'Lord, you are the God who saves me; day and night I cry out to you.', prompt: 'What day and night longing do you have?' },

  // April (Days 90-119)
  { ref: 'Romans 6:3-4', text: 'Or don\'t you know that all of us who were baptized into Christ Jesus were baptized into his death? We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.', prompt: 'What new life is rising?' },
  { ref: 'Psalm 118:24', text: 'The Lord has done it this very day; let us be glad and rejoice.', prompt: 'What joy is this day bringing?' },
  { ref: '1 Corinthians 15:57', text: 'But thanks be to God, who gives us the victory through our Lord Jesus Christ.', prompt: 'What victory are you celebrating?' },
  { ref: 'Psalm 113:1-3', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Let the name of the Lord be praised, both now and forevermore. From the rising of the sun to the place where it sets, the name of the Lord is to be praised.', prompt: 'How does creation praise?' },
  { ref: 'John 20:19-20', text: 'On the evening of that first day of the week, when the disciples were together, with the doors locked for fear of the Jews, Jesus came and stood among them and said, "Peace be with you!"', prompt: 'What peace is Christ offering?' },
  { ref: 'Psalm 23:4', text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.', prompt: 'What dark valley needs crossing?' },
  { ref: 'Revelation 1:5-6', text: 'To him who loves us and has freed us from our sins by his blood, and has made us to be a kingdom and priests to serve his God and Father—to him be glory and power for ever and ever!', prompt: 'What freedom has Christ given?' },
  { ref: 'Psalm 47:5-6', text: 'God has ascended amid shouts of joy, the Lord amid the sounding of trumpets. Sing praises to God, sing praises; sing praises to our King, sing praises.', prompt: 'What ascension are you celebrating?' },
  { ref: '1 Peter 1:3-4', text: 'Praise be to the God and Father of our Lord Jesus Christ! In his great mercy he has given us new birth into a living hope through the resurrection of Jesus Christ from the dead, and into an inheritance that can never perish, spoil or fade.', prompt: 'What living hope sustains you?' },
  { ref: 'Psalm 103:1-2', text: 'Praise the Lord, my soul; all my inmost being, praise his holy name. Praise the Lord, my soul, and forget not all his benefits.', prompt: 'What benefits are you forgetting?' },
  { ref: 'John 14:19', text: '"Because I live, you also will live."', prompt: 'What resurrection life are you living?' },
  { ref: 'Psalm 80:7', text: 'Restore us, God Almighty; make your face shine on us, that we may be saved.', prompt: 'What restoration do you seek?' },
  { ref: 'Ephesians 1:7-8', text: 'In him we have redemption through his blood, the forgiveness of sins, in accordance with the riches of God\'s grace that he lavished on us.', prompt: 'What grace are you lavished with?' },
  { ref: 'Psalm 93:1', text: 'The Lord reigns, he is robed in majesty; the Lord is robed in majesty and armed with strength; indeed, the world is established, firm and secure.', prompt: 'What majesty are you witnessing?' },
  { ref: 'Matthew 28:5-6', text: '"Do not be afraid, for I know that you are looking for Jesus, who has been crucified. He is not here; he has risen, just as he said."', prompt: 'What fear can rise be easing?' },
  { ref: 'Psalm 113:4-6', text: 'The Lord is exalted over all the nations, his glory above the heavens. Who is like the Lord our God, the One who sits enthroned on high, who stoops down to look on the heavens and the earth?', prompt: 'How does God stoop to you?' },
  { ref: 'Colossians 3:1', text: 'Since, then, you have been raised with Christ, set your hearts on things above, where Christ is, seated at the right hand of God.', prompt: 'What things above are you seeking?' },
  { ref: 'Psalm 42:4', text: 'These things I remember as I pour out my soul: how I used to go to the house of God under the protection of the Mighty One with shouts of joy and praise among the festive throng.', prompt: 'What joy do you remember?' },
  { ref: 'Acts 4:31-32', text: 'After they prayed, the place where they were meeting was shaken. And they were all filled with the Holy Spirit and spoke the word of God boldly... All the believers were one in heart and mind.', prompt: 'What boldness is the Spirit giving?' },
  { ref: 'Psalm 30:11-12', text: 'You turned my wailing into dancing; you removed my sackcloth and clothed me with joy, that my heart may sing your praises and not be silent. Lord my God, I will give you thanks forever.', prompt: 'What wailing is becoming dancing?' },
  { ref: 'Luke 24:32', text: '"Were not our hearts burning within us while he talked with us on the road and opened the Scriptures to us?"', prompt: 'What burning do you feel?' },
  { ref: 'Psalm 97:11-12', text: 'Light shines on the righteous and joy on the upright in heart. Rejoice in the Lord, you who are righteous, and praise his holy name.', prompt: 'What light is shining?' },
  { ref: 'Hebrews 10:24-25', text: 'And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together... but encouraging one another.', prompt: 'Who encourages you?' },
  { ref: 'Psalm 118:1', text: 'Give thanks to the Lord, for he is good; his love endures forever.', prompt: 'What love is enduring?' },
  { ref: 'John 10:27-28', text: '"My sheep listen to my voice; I know them, and they follow me. I give them eternal life, and they shall never perish; no one will snatch them out of my hand."', prompt: 'Do you hear Jesus\'s voice?' },

  // May (Days 120-150)
  { ref: 'Acts 1:8', text: '"But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth."', prompt: 'What power is the Spirit giving?' },
  { ref: 'Psalm 68:11', text: 'The Lord announced the word, and great was the company of those who proclaimed it.', prompt: 'What word will you announce?' },
  { ref: 'Acts 2:1-4', text: 'When the day of Pentecost came, all the believers were together in one place. Suddenly a sound like the blowing of a violent wind came from heaven and filled the whole house where they were sitting... They saw what seemed to be tongues of fire.', prompt: 'Where is the Spirit moving?' },
  { ref: 'Psalm 104:30', text: 'When you send your Spirit, they are created, and you renew the face of the ground.', prompt: 'What is being renewed?' },
  { ref: '1 Corinthians 12:4-6', text: 'There are different kinds of gifts, but the same Spirit distributes them... to each one the manifestation of the Spirit is given for the common good.', prompt: 'What gift has the Spirit given you?' },
  { ref: 'Psalm 139:7', text: 'Where can I go from your Spirit? Where can I flee from your presence?', prompt: 'Where is God present?' },
  { ref: 'Galatians 5:22-23', text: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.', prompt: 'What fruit is growing?' },
  { ref: 'Psalm 33:4', text: 'For the word of the Lord is right and true; he is faithful in all he does.', prompt: 'What faithfulness are you witnessing?' },
  { ref: 'Romans 8:26-27', text: 'In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us with groans that words cannot express.', prompt: 'What intercession is happening?' },
  { ref: 'Psalm 145:21', text: 'My mouth will speak in praise of the Lord. Let every creature praise his holy name for ever and ever.', prompt: 'What praise do you speak?' },
  { ref: 'Ephesians 5:18-19', text: 'Be filled with the Spirit. Speak to one another with psalms, hymns, and songs from the Spirit. Sing and make music from your heart to the Lord.', prompt: 'What music is your heart making?' },
  { ref: 'Psalm 36:7-9', text: 'How priceless is your unfailing love, O God! People take refuge in the shadow of your wings... For with you is the fountain of life; in your light we see light.', prompt: 'Where is the fountain?' },
  { ref: 'John 15:26-27', text: '"When the Advocate comes, whom I will send to you from the Father—the Spirit of truth who goes out from the Father—he will testify about me. And you also must testify, for you have been with me from the beginning."', prompt: 'How will you testify?' },
  { ref: 'Psalm 63:7-8', text: 'Because you are my help, I sing in the shadow of your wings. I cling to you; your right hand upholds me.', prompt: 'What upholds you?' },
  { ref: 'Acts 17:28', text: '"For in him we live and move and have our being."', prompt: 'How are you living in God?' },
  { ref: 'Psalm 104:1', text: 'Praise the Lord, my soul. Lord my God, you are very great; you are clothed with splendor and majesty.', prompt: 'What splendor are you beholding?' },
  { ref: 'Proverbs 16:9', text: 'In their hearts humans plan their course, but the Lord establishes their steps.', prompt: 'Whose steps are being established?' },
  { ref: 'Psalm 118:14', text: 'The Lord is my strength and my defense; he has become my salvation.', prompt: 'What strength is becoming clear?' },
  { ref: 'John 3:8', text: '"The wind blows wherever it pleases. You hear its sound, but you cannot tell where it comes from or where it is going. So it is with everyone born of the Spirit."', prompt: 'Where is the Spirit moving?' },
  { ref: 'Psalm 150:1-6', text: 'Praise the Lord... Praise him with the sounding of the trumpet, praise him with the harp and lyre, praise him with timbrel and dance, praise him with the strings and pipe, praise him with the clash of cymbals.', prompt: 'What instrument is your life?' },
  { ref: 'Isaiah 11:2-3', text: 'The Spirit of the Lord will rest on him—the Spirit of wisdom and understanding, the Spirit of counsel and of might, the Spirit of the knowledge and fear of the Lord.', prompt: 'What Spirit-gift do you need?' },
  { ref: 'Psalm 92:1-2', text: 'It is good to praise the Lord and make music to your name, O Most High, proclaiming your love in the morning and your faithfulness at night.', prompt: 'What morning and night worship?' },
  { ref: 'Proverbs 20:12', text: 'Ears that hear and eyes that see—the Lord has made them both.', prompt: 'What are you seeing and hearing?' },
  { ref: 'Psalm 84:5-7', text: 'Blessed are those whose strength is in you... They go from strength to strength, till each appears before God in Zion.', prompt: 'What strength is building?' },
  { ref: 'Isaiah 42:5', text: 'This is what God the Lord says—the Creator of the heavens, who stretches them out, who spreads out the earth with all that springs from it.', prompt: 'What is spreading out?' },
  { ref: 'Psalm 8:3-4', text: 'When I consider your heavens, the work of your fingers, the moon and the stars, which you have set in place, what is mankind that you are mindful of them, the human race that you care for them?', prompt: 'Why does God care for you?' },

  // June (Days 151-180)
  { ref: 'Matthew 6:9-13', text: '"Our Father in heaven, hallowed be your name, your kingdom come, your will be done, on earth as it is in heaven. Give us today our daily bread. And forgive us our debts..."', prompt: 'How do you pray the Lord\'s Prayer?' },
  { ref: 'Psalm 37:5', text: 'Commit your way to the Lord; trust in him and he will do this.', prompt: 'What way are you committing?' },
  { ref: 'Proverbs 22:3', text: 'The prudent see danger and take refuge, but the simple keep going and pay the penalty.', prompt: 'What wisdom keeps you safe?' },
  { ref: 'Psalm 73:25-26', text: 'Whom have I in heaven but you? And earth has nothing I desire besides you. My flesh and my heart may fail, but God is the strength of my heart and my portion forever.', prompt: 'What is your portion?' },
  { ref: 'Matthew 13:31-32', text: '"The kingdom of heaven is like a mustard seed, which a man took and planted in his field. Though it is the smallest of all seeds, yet when it grows, it is the largest of the garden plants."', prompt: 'What is growing from small seeds?' },
  { ref: 'Psalm 15:1-5', text: 'Lord, who may dwell in your sacred tent? Who may live on your holy mountain? The one whose walk is blameless, who does what is righteous, who speaks the truth from their heart.', prompt: 'How are you living righteously?' },
  { ref: 'Proverbs 11:25', text: 'A generous person will prosper; whoever refreshes others will be refreshed.', prompt: 'How are you giving generously?' },
  { ref: 'Psalm 119:97-99', text: 'Oh, how I love your law! I meditate on it all day long... I have more insight than all my teachers, for I meditate on your statutes.', prompt: 'What law are you meditating on?' },
  { ref: 'James 1:22-25', text: '"Do not merely listen to the word... Do what it says... Whoever looks intently into the perfect law that gives freedom, and continues in it... will be blessed in what they do."', prompt: 'How are you acting on God\'s word?' },
  { ref: 'Psalm 40:8', text: 'I desire to do your will, my God; your law is within my heart.', prompt: 'What will are you desiring?' },
  { ref: 'Isaiah 55:8-9', text: '"For my thoughts are not your thoughts, neither are your ways my ways, declares the Lord. As the heavens are higher than the earth, so are my ways higher than your ways and my thoughts than your thoughts."', prompt: 'What mystery are you embracing?' },
  { ref: 'Psalm 48:9-10', text: 'Within your temple, O God, we meditate on your unfailing love. Like your name, O God, your praise reaches to the ends of the earth.', prompt: 'What love are you meditating on?' },
  { ref: 'Proverbs 31:8-9', text: '"Speak up for those who cannot speak for themselves, for the rights of all who are destitute. Speak up and judge fairly; defend the rights of the poor and needy."', prompt: 'Who needs your voice?' },
  { ref: 'Psalm 82:3-4', text: '"Defend the cause of the weak and fatherless; maintain the rights of the poor and oppressed. Rescue the weak and needy."', prompt: 'What justice are you pursuing?' },
  { ref: 'Matthew 25:31-40', text: '"The King will reply, \'I tell you the truth, whatever you did for the least of these brothers and sisters of mine, you did for me.\'"', prompt: 'Who is Christ in your midst?' },
  { ref: 'Psalm 112:1-9', text: 'Blessed is the man who fears the Lord, who finds great delight in his commands... He has scattered abroad his gifts to the poor, his righteousness endures forever.', prompt: 'How are you spreading gifts?' },
  { ref: 'Proverbs 15:22', text: 'Plans fail for lack of counsel, but with many advisers they succeed.', prompt: 'What counsel are you seeking?' },
  { ref: 'Psalm 127:1', text: 'Unless the Lord builds the house, the builders labor in vain.', prompt: 'What are you building with God?' },
  { ref: 'Luke 11:9-10', text: '"Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. For everyone who asks receives; the one who seeks finds; and to the one who knocks, the door will be opened."', prompt: 'What will you ask for?' },
  { ref: 'Psalm 121:7-8', text: 'The Lord will keep you from all harm—he will watch over your life; the Lord will watch over your coming and going both now and forevermore.', prompt: 'What protection do you trust?' },
  { ref: 'Proverbs 27:12', text: 'The prudent see danger and take refuge, but the simple keep going and pay the penalty.', prompt: 'What danger are you avoiding?' },
  { ref: 'Psalm 128:1-4', text: 'Blessed are all who fear the Lord, who walk in obedience to him... May the Lord bless you from Zion, all the days of your life.', prompt: 'What blessing are you seeking?' },
  { ref: 'Isaiah 26:3', text: 'You will keep in perfect peace those whose minds are steadfast, because they trust in you.', prompt: 'What peace are you seeking?' },
  { ref: 'Psalm 139:23-24', text: 'Search me, God, and know my heart; test me and know my anxious thoughts. See if there is any offensive way in me, and lead me in the way everlasting.', prompt: 'What needs searching?' },
  { ref: 'Proverbs 4:23', text: 'Above all else, guard your heart, for everything you do flows from it.', prompt: 'What are you guarding?' },
  { ref: 'Psalm 32:8', text: 'I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you.', prompt: 'What instruction are you receiving?' },

  // July (Days 181-211)
  { ref: 'Deuteronomy 6:4-6', text: '"Hear, O Israel: The Lord our God, the Lord is one. Love the Lord your God with all your heart and with all your soul and with all your strength. These commandments that I give you today are to be on your hearts."', prompt: 'How are you loving with all?' },
  { ref: 'Psalm 147:1-3', text: 'Praise the Lord. How good it is to sing praises to our God, how pleasant and fitting to praise him! The Lord builds up Jerusalem; he gathers the exiles of Israel. He heals the brokenhearted and binds up their wounds.', prompt: 'What wounds are being healed?' },
  { ref: 'Leviticus 19:18', text: '"Do not seek revenge or bear a grudge against anyone among your people, but love your neighbor as yourself. I am the Lord."', prompt: 'How are you loving your neighbor?' },
  { ref: 'Psalm 100:4-5', text: 'Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name. For the Lord is good and his love endures forever.', prompt: 'What gratitude do you bring?' },
  { ref: 'Matthew 22:37-40', text: '"Love the Lord your God with all your heart and with all your soul and with all your mind... And the second is like it: \'Love your neighbor as yourself.\' All the Law and the Prophets hang on these two commandments."', prompt: 'How do these commands anchor you?' },
  { ref: 'Psalm 19:1', text: 'The heavens declare the glory of God; the skies proclaim the work of his hands.', prompt: 'What glory are you beholding?' },
  { ref: 'Song of Solomon 2:4-5', text: 'He has taken me to the banquet hall, and his banner over me is love... Strengthen me with raisins, refresh me with apples, for I am faint with love.', prompt: 'What love is strengthening you?' },
  { ref: 'Psalm 84:1-2', text: 'How lovely is your dwelling place, Lord Almighty! My soul yearns, even faints, for the courts of the Lord; my heart and my flesh cry out for the living God.', prompt: 'What are you yearning for?' },
  { ref: 'Proverbs 5:11-14', text: '"At the end of your life you will groan, when your flesh and body are spent. You will say, \'How I hated discipline! How my heart spurned correction!\'"', prompt: 'What correction are you accepting?' },
  { ref: 'Psalm 16:1', text: 'Keep me safe, my God, for in you I take refuge.', prompt: 'What refuge are you taking?' },
  { ref: 'John 13:34-35', text: '"A new command I give you: Love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another."', prompt: 'How are you showing this love?' },
  { ref: 'Psalm 1:1-3', text: 'Blessed is the one who does not walk in step with the wicked... but whose delight is in the law of the Lord... That person is like a tree planted by streams of water.', prompt: 'What roots are growing deep?' },
  { ref: 'Proverbs 10:12', text: 'Hatred stirs up conflict, but love covers over all wrongs.', prompt: 'What wrongs can love cover?' },
  { ref: 'Psalm 46:1-3', text: 'God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea.', prompt: 'What trembling can God steady?' },
  { ref: 'Matthew 5:38-42', text: '"If someone forces you to go one mile, go with them two miles. Give to the one who asks you, and do not turn away from the one who wants to borrow from you."', prompt: 'Where can you go further?' },
  { ref: 'Psalm 61:3-4', text: 'For you have been my refuge, a strong tower against the foe. I long to dwell in your tent forever and take refuge in the shelter of your wings.', prompt: 'What tower protects you?' },
  { ref: 'Proverbs 17:17', text: 'A friend loves at all times, and a brother is born for a time of adversity.', prompt: 'Who loves you at all times?' },
  { ref: 'Psalm 71:1-3', text: 'In you, Lord, I have taken refuge; let me never be put to shame. In your righteousness, rescue me and deliver me; turn your ear to me and save me.', prompt: 'What shame are you releasing?' },
  { ref: 'Isaiah 40:11', text: 'He tends his flock like a shepherd: He gathers the lambs in his arms and carries them close to his heart; he gently leads those that have young.', prompt: 'How is God shepherding you?' },
  { ref: 'Psalm 111:1-2', text: 'Praise the Lord. I will extol the Lord with all my heart in the council of the upright and in the assembly. Great are the works of the Lord; they are pondered by all who delight in them.', prompt: 'What great works are you pondering?' },
  { ref: 'Proverbs 13:20', text: 'Walk with the wise and become wise, for a companion of fools suffers harm.', prompt: 'Who are you walking with?' },
  { ref: 'Psalm 37:23-24', text: 'The Lord makes firm the steps of the one who delights in him; though he may stumble, he will not fall, for the Lord upholds him with his hand.', prompt: 'What stumbling is being held?' },
  { ref: 'Matthew 6:31-33', text: '"So do not worry, saying \'What shall we eat?\' or \'What shall we drink?\' or \'What shall we wear?\'... But seek first his kingdom and his righteousness, and all these things will be given to you as well."', prompt: 'What are you seeking first?' },
  { ref: 'Psalm 119:49-50', text: 'Remember your word to your servant, for you have given me hope. My comfort in my suffering is this: Your promise preserves my life.', prompt: 'What promise preserves you?' },
  { ref: 'Proverbs 18:24', text: 'A man of many companions may come to ruin, but there is a friend who sticks closer than a brother.', prompt: 'Who sticks close to you?' },
  { ref: 'Psalm 23:2-3', text: 'He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul. He guides me along the right paths for his name\'s sake.', prompt: 'What right path are you on?' },

  // August (Days 212-242)
  { ref: 'Proverbs 8:1-11', text: '"Does not wisdom call out?... I, wisdom, dwell together with prudence; I possess knowledge and discretion... Wisdom is more precious than rubies, and nothing you desire can compare with her."', prompt: 'What wisdom are you seeking?' },
  { ref: 'Psalm 119:65-66', text: 'Do good to your servant according to your word, Lord. Teach me knowledge and good judgment, for I trust in your commands.', prompt: 'What knowledge are you seeking?' },
  { ref: 'James 3:17', text: 'But the wisdom that comes from heaven is first of all pure; then peace-loving, considerate, submissive, full of mercy and good fruit, impartial and sincere.', prompt: 'What heavenly wisdom shows?' },
  { ref: 'Psalm 90:12', text: 'Teach us to number our days, that we may gain a heart of wisdom.', prompt: 'What wisdom age brings?' },
  { ref: 'Proverbs 1:7', text: 'The fear of the Lord is the beginning of knowledge, but fools despise wisdom and instruction.', prompt: 'What fear begins wisdom?' },
  { ref: 'Psalm 119:34', text: 'Give me understanding, so that I may keep your law and obey it with all my heart.', prompt: 'What understanding do you need?' },
  { ref: 'Matthew 7:24', text: '"Therefore everyone who hears these words of mine and puts them into practice is like a wise man who built his house on the rock."', prompt: 'What foundation are you building?' },
  { ref: 'Psalm 37:30-31', text: 'The mouths of the righteous utter wisdom, and their tongues speak what is just. The law of their God is in their hearts.', prompt: 'What wisdom does your mouth speak?' },
  { ref: 'Proverbs 16:16', text: 'How much better to get wisdom than gold, to get insight rather than silver!', prompt: 'What value do you place on wisdom?' },
  { ref: 'Psalm 25:12-13', text: 'Who, then, are those who fear the Lord? He will instruct them in the ways they should choose... they will spend their days in prosperity.', prompt: 'What instruction are you receiving?' },
  { ref: 'Ecclesiastes 7:12', text: 'Wisdom is a shelter as money is a shelter, but the advantage of knowledge is this: that wisdom preserves the life of its possessor.', prompt: 'What shelter does wisdom provide?' },
  { ref: 'Psalm 119:99-100', text: 'I have more insight than all my teachers, for I meditate on your statutes... I have more understanding than the elders, for I obey your precepts.', prompt: 'What meditation gives insight?' },
  { ref: 'Proverbs 19:8', text: 'The one who gets wisdom loves life; the one who cherishes understanding will soon prosper.', prompt: 'What love of life brings prosperity?' },
  { ref: 'Psalm 111:10', text: 'The fear of the Lord is the beginning of wisdom; all who follow his precepts have good understanding.', prompt: 'What good understanding comes?' },
  { ref: 'Deuteronomy 4:6', text: '"Observe them carefully, for this will show your wisdom and understanding to the nations, who will hear about all these decrees and say, \'Surely this great nation is a wise and understanding people.\'"', prompt: 'How does your life show wisdom?' },
  { ref: 'Psalm 119:128', text: 'and because I consider all your precepts right, I hate every wrong path.', prompt: 'What wrong path do you hate?' },
  { ref: 'Proverbs 20:15', text: 'Gold there is, and rubies in abundance, but lips that speak knowledge are a rare jewel.', prompt: 'What knowledge do you speak?' },
  { ref: 'Psalm 12:6', text: 'And the words of the Lord are flawless, like silver purified in a crucible, like gold refined seven times.', prompt: 'What word are you treasuring?' },
  { ref: 'Proverbs 22:17-19', text: '"Pay attention and listen to the sayings of the wise, apply your heart to what I teach, for it is pleasing when you keep them in your heart and have all of them ready on your lips."', prompt: 'What sayings are you keeping?' },
  { ref: 'Psalm 119:104-105', text: 'I gain understanding from your precepts; therefore I hate every wrong path. Your word is a lamp to my feet and a light to my path.', prompt: 'What path is being lit?' },
  { ref: 'Proverbs 2:1-5', text: '"My son, if you accept my words and store up my commands within you, turning your ear to wisdom and applying your heart to understanding... then you will understand the fear of the Lord and find the knowledge of God."', prompt: 'What knowledge are you storing?' },
  { ref: 'Psalm 32:8-9', text: 'I will instruct you and teach you in the way you should go; I will counsel you and watch over you. Do not be like the horse or the mule, which have no understanding.', prompt: 'What instruction are you accepting?' },
  { ref: 'Proverbs 11:2', text: 'When pride comes, then comes disgrace, but with humility comes wisdom.', prompt: 'What pride are you releasing?' },
  { ref: 'Psalm 119:27-28', text: 'Let me understand the teaching of your precepts; then I will meditate on your wonders. My soul is weary with sorrow; strengthen me according to your word.', prompt: 'What wonders are you meditating on?' },
  { ref: 'Proverbs 9:9', text: 'Instruct the wise and they will be wiser still; teach the righteous and they will add to their learning.', prompt: 'How are you growing in learning?' },
  { ref: 'Psalm 107:42-43', text: 'The upright see and rejoice, but all the wicked shut their mouths. Let the one who is wise heed these things and ponder the loving deeds of the Lord.', prompt: 'What loving deeds are you pondering?' },

  // September (Days 243-272)
  { ref: 'Proverbs 27:1-2', text: '"Do not boast about tomorrow, for you do not know what a day may bring. Let someone else praise you, and not your own mouth; an outsider, and not your own lips."', prompt: 'What praise are you releasing?' },
  { ref: 'Psalm 100:1-3', text: 'Shout for joy to the Lord, all the earth. Worship the Lord with gladness; come before him with joyful songs. Know that the Lord is God. It is he who made us, and we are his; we are his people, the sheep of his pasture.', prompt: 'What joy can you shout?' },
  { ref: 'Ecclesiastes 5:18-19', text: 'When God gives someone wealth and possessions, and the ability to enjoy them, to accept their lot and be happy in their toil—this is a gift of God.', prompt: 'What gift are you accepting?' },
  { ref: 'Psalm 104:24', text: 'How many are your works, Lord! In wisdom you made them all; the earth is full of your creatures.', prompt: 'What works are you marveling at?' },
  { ref: 'Proverbs 30:8-9', text: '"Give me neither poverty nor riches, but give me only my daily bread. Otherwise, I may have too much and disown you and say, \'Who is the Lord?\' Or I may become poor and steal, and so dishonor the name of my God."', prompt: 'What contentment are you seeking?' },
  { ref: 'Psalm 119:140', text: 'Your promises have been thoroughly tested, and your servant loves them.', prompt: 'What promise are you testing?' },
  { ref: '1 Timothy 6:7-8', text: 'For we brought nothing into the world, and we can take nothing out of it. But if we have food and clothing, we will be content with that.', prompt: 'What are you content with?' },
  { ref: 'Psalm 73:24-26', text: 'You guide me with your counsel, and later you will take me into glory. Whom have I in heaven but you? And earth has nothing I desire besides you... God is the strength of my heart and my portion forever.', prompt: 'What glory awaits?' },
  { ref: 'Philippians 4:11-13', text: '"I am not saying this because I am in need, for I have learned to be content whatever the circumstances... I have learned the secret of being content in any and every situation."', prompt: 'What secret of contentment calls?' },
  { ref: 'Psalm 37:16-17', text: 'Better the little that the righteous have than the wealth of many wicked; for the power of the wicked will be broken, but the Lord upholds the righteous.', prompt: 'What little is enough?' },
  { ref: 'Proverbs 15:16-17', text: '"Better a small serving of vegetables where there is love than a fattened calf with hatred... Better a dish of vegetables where there is love than a fattened calf with hatred."', prompt: 'What love feeds you?' },
  { ref: 'Psalm 23:1', text: 'The Lord is my shepherd, I lack nothing.', prompt: 'What do you lack?' },
  { ref: 'Hebrews 13:5', text: '"Keep your lives free from the love of money and be content with what you have, because God has said, \'Never will I leave you; never will I forsake you.\'"', prompt: 'What contentment is freedom?' },
  { ref: 'Psalm 84:11-12', text: 'For the Lord God is a sun and shield; the Lord bestows favor and honor; no good thing does he withhold from those whose walk is blameless. Lord Almighty, blessed is the one who trusts in you.', prompt: 'What blessing comes from trust?' },
  { ref: 'Proverbs 17:1', text: 'Better a dry crust with peace and quiet than a house full of feasting, with strife.', prompt: 'What peace do you choose?' },
  { ref: 'Psalm 119:111-112', text: 'Your statutes are my heritage forever; they are the joy of my heart. My heart is set on keeping your decrees to the very end.', prompt: 'What is your heritage?' },
  { ref: '1 John 2:15-17', text: '"Do not love the world or anything in the world... everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world. The world and its desires pass away, but whoever does the will of God lives forever."', prompt: 'What will you cling to?' },
  { ref: 'Psalm 42:11', text: 'Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God, for I will yet praise him, my Savior and my God.', prompt: 'What hope can be found?' },
  { ref: 'Proverbs 14:30', text: 'A heart at peace gives life to the body, but envy rots the bones.', prompt: 'What envy are you releasing?' },
  { ref: 'Psalm 128:1-2', text: 'Blessed are all who fear the Lord, who walk in obedience to him. You will eat the fruit of your labor; blessings and prosperity will be yours.', prompt: 'What obedience brings blessing?' },
  { ref: 'Luke 12:15', text: '"Life does not consist in an abundance of possessions."', prompt: 'What life are you choosing?' },
  { ref: 'Psalm 37:7', text: 'Be still before the Lord and wait patiently for him; do not fret when people succeed in their ways, when they carry out their wicked schemes.', prompt: 'What stillness can you find?' },
  { ref: 'Proverbs 23:4-5', text: '"Do not wear yourself out to get rich; do not trust your own cleverness. Cast but a glance at riches, and they are gone, for they will surely sprout wings and fly off to the sky like an eagle."', prompt: 'What riches are passing?' },
  { ref: 'Psalm 39:4-5', text: '"Show me, Lord, my life\'s end and the number of my days; let me know how fleeting my life is... You have made my days a mere handbreadth; the span of my years is as nothing before you."', prompt: 'What fleeting moment are you in?' },

  // October (Days 273-303)
  { ref: 'Deuteronomy 16:11', text: '"And rejoice before the Lord your God at the place he will choose as a dwelling for his Name—you, your sons and daughters, your male and female servants, the Levites in your towns, and the foreigners, orphans and widows living among you."', prompt: 'Who are you rejoicing with?' },
  { ref: 'Psalm 100:1-5', text: 'Shout for joy to the Lord, all the earth. Worship the Lord with gladness; come before him with joyful songs. Know that the Lord is good; his love endures forever; his faithfulness continues through all generations.', prompt: 'What faithfulness endures?' },
  { ref: 'Colossians 3:15-17', text: '"Let the peace of Christ rule in your hearts, since as members of one body you were called to peace. And be thankful. Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit, singing to God with gratitude in your hearts."', prompt: 'What peace rules your heart?' },
  { ref: 'Psalm 107:1', text: 'Give thanks to the Lord, for he is good; his love endures forever.', prompt: 'What enduring love do you celebrate?' },
  { ref: 'Philippians 4:4-5', text: '"Rejoice in the Lord always. I will say it again: Rejoice!... The Lord is near."', prompt: 'What nearness brings joy?' },
  { ref: 'Psalm 95:1-7', text: 'Come, let us sing for joy to the Lord; let us shout aloud to the Rock of our salvation... For he is our God and we are the people of his pasture, the flock under his care.', prompt: 'What flock do you belong to?' },
  { ref: '1 Thessalonians 5:16-18', text: '"Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus."', prompt: 'What circumstances hold gratitude?' },
  { ref: 'Psalm 103:1-4', text: 'Praise the Lord, my soul; all my inmost being, praise his holy name. Praise the Lord, my soul, and forget not all his benefits—who forgives all your sins and heals all your diseases, who redeems your life from the pit and crowns you with love and compassion.', prompt: 'What disease is being healed?' },
  { ref: 'Proverbs 31:10-31', text: '"A wife of noble character who can find? She is worth far more than rubies... She is clothed with strength and dignity; she can laugh at the days to come... Charm is deceptive, and beauty is fleeting; but a woman who fears the Lord is to be praised."', prompt: 'What strength are you wearing?' },
  { ref: 'Psalm 113:7-9', text: 'He raises the poor from the dust and lifts the needy from the ash heap; he seats them with princes, with the princes of his people. He settles the childless woman in her home as a happy mother of children.', prompt: 'What lifting is happening?' },
  { ref: 'Luke 1:46-50', text: '"My soul glorifies the Lord and my spirit rejoices in God my Savior, for he has been mindful of the humble state of his servant... His mercy extends to those who fear him, from generation to generation."', prompt: 'What generation benefits?' },
  { ref: 'Psalm 31:23-24', text: 'Love the Lord, all his faithful people! The Lord preserves those who are true to him... Be strong and take heart, all you who hope in the Lord.', prompt: 'What hope is strengthening?' },
  { ref: 'Deuteronomy 8:18', text: '"But remember the Lord your God, for it is he who gives you the ability to produce wealth, and so confirms his covenant, which he swore to your ancestors, as it is today."', prompt: 'What ability are you exercising?' },
  { ref: 'Psalm 65:9-13', text: 'You care for the land and water it; you enrich it abundantly... The grasslands are clothed with flocks and the valleys are mantled with grain; they shout for joy and sing.', prompt: 'What shouting joy do you hear?' },
  { ref: 'Proverbs 10:22', text: 'The blessing of the Lord brings wealth, without painful toil for it.', prompt: 'What wealth are you blessing?' },
  { ref: 'Psalm 126:1-6', text: 'When the Lord restored the fortunes of Zion, we were like those who dreamed. Our mouths were filled with laughter, our tongues with songs of joy... Those who go out weeping, carrying seed to sow, will return with songs of joy, carrying sheaves with them.', prompt: 'What song are you carrying?' },
  { ref: 'Joel 2:26', text: '"You will have plenty to eat, until you are full, and you will praise the name of the Lord your God, who has worked wonders for you."', prompt: 'What wonder are you tasting?' },
  { ref: 'Psalm 149:1-5', text: 'Praise the Lord. Sing to the Lord a new song, his praise in the assembly of his faithful people... Let Israel rejoice in their Maker... Let them celebrate their God with tambourines and harp.', prompt: 'What new song will you sing?' },
  { ref: 'Proverbs 15:15', text: 'The cheerful heart has a continual feast.', prompt: 'What cheer fills you?' },
  { ref: 'Psalm 30:1-5', text: 'I will exalt you, Lord, for you lifted me out of the depths... Sing to the Lord, you his faithful people, praise his holy name. For his anger lasts only a moment, but his favor lasts a lifetime.', prompt: 'What moment is lifting?' },
  { ref: 'Nehemiah 8:10', text: '"The joy of the Lord is your strength... Do not grieve, for the joy of the Lord is your strength."', prompt: 'What joy is your strength?' },
  { ref: 'Psalm 118:23-24', text: 'The Lord has done this, and it is marvelous in our eyes. The Lord has done it this very day; let us be glad and rejoice in it.', prompt: 'What marvelous thing happened today?' },

  // November (Days 304-333)
  { ref: 'Psalm 145:1-3', text: 'I will exalt you, my God the King; I will praise your name for ever and ever. Every day I will praise you and extol your name for ever and ever. Great is the Lord and most worthy of praise.', prompt: 'What greatness are you praising?' },
  { ref: 'Psalm 92:1-4', text: 'It is good to praise the Lord and make music to your name, O Most High, proclaiming your love in the morning and your faithfulness at night, to the music of the ten-stringed lyre and the melody of the harp. For you make me glad by your deeds, Lord; I sing for joy at what your hands have done.', prompt: 'What deeds bring you joy?' },
  { ref: 'Psalm 33:1-5', text: 'Sing joyfully to the Lord, you righteous; it is fitting for the upright to praise him. Praise the Lord with the harp; make music to him on the ten-stringed lyre. Sing to him a new song; play skillfully, and shout for joy.', prompt: 'What new song are you singing?' },
  { ref: 'Psalm 96:1-4', text: 'Sing to the Lord a new song; sing to the Lord, all the earth. Sing to the Lord, praise his name; proclaim his salvation day after day... Great is the Lord and most worthy of praise.', prompt: 'What salvation are you proclaiming?' },
  { ref: 'Psalm 148:1-6', text: 'Praise the Lord. Praise the Lord from the heavens; praise him in the heights above. Praise him, all his angels; praise him, all his heavenly hosts... Let them praise the name of the Lord, for at his command they were created.', prompt: 'What creation praises God?' },
  { ref: 'Psalm 150:1-6', text: 'Praise the Lord. Praise God in his sanctuary; praise him in his mighty heavens... Praise him with the sounding of the trumpet, praise him with the harp and lyre, praise him with timbrel and dance, praise him with the strings and pipe.', prompt: 'What instrument is your life?' },
  { ref: 'Proverbs 8:30-31', text: '"Then I was the craftsman at his side. I was filled with delight day after day, rejoicing always in his presence, rejoicing in his whole world and delighting in mankind."', prompt: 'What delight surrounds you?' },
  { ref: 'Psalm 98:1-4', text: 'Sing to the Lord a new song, for he has done marvelous things... He has remembered his love and his faithfulness to the house of Israel... Shout for joy to the Lord, all the earth.', prompt: 'What marvel are you singing?' },
  { ref: 'Psalm 95:6-7', text: 'Come, let us bow down in worship, let us kneel before the Lord our Maker; for he is our God and we are the people of his pasture, the flock under his care.', prompt: 'What flock are you part of?' },
  { ref: 'Isaiah 61:10', text: 'I delight greatly in the Lord; my soul rejoices in my God. For he has clothed me with garments of salvation and arrayed me in a robe of his righteousness.', prompt: 'What robes are you wearing?' },
  { ref: 'Psalm 97:1-2', text: 'The Lord reigns, let the earth be glad; let the distant shores rejoice. Clouds and thick darkness surround him; righteousness and justice are the foundation of his throne.', prompt: 'What justice is his foundation?' },
  { ref: 'Proverbs 11:25', text: 'A generous person will prosper; whoever refreshes others will be refreshed.', prompt: 'Who refreshes you?' },
  { ref: 'Psalm 112:1-9', text: 'Blessed is the man who fears the Lord, who finds great delight in his commands... He has scattered abroad his gifts to the poor, his righteousness endures forever; his horn will be lifted high in honor.', prompt: 'What gifts are you scattering?' },
  { ref: 'Psalm 89:1', text: 'I will sing of the Lord\'s great love forever; with my mouth I will make your faithfulness known through all generations.', prompt: 'What faithfulness will you pass on?' },
  { ref: 'Malachi 3:10', text: '"Bring the whole tithe into the storehouse... and see if I will not throw open the floodgates of heaven and pour out so much blessing that you will not have room enough for it."', prompt: 'What blessing are you making room for?' },
  { ref: 'Psalm 34:1-8', text: 'I will extol the Lord at all times; his praise will always be on my lips... Those who look to him are radiant; their faces are never covered with shame.', prompt: 'What radiance do you reflect?' },
  { ref: 'Proverbs 22:9', text: 'The generous will themselves be blessed, for they share their food with the poor.', prompt: 'What food can you share?' },
  { ref: 'Psalm 103:10-12', text: 'He does not treat us as our sins deserve or repay us according to our iniquities. For as high as the heavens are above the earth, so great is his love for those who fear him; as far as the east is from the west, so far has he removed our transgressions from us.', prompt: 'What distance has he created?' },
  { ref: 'Luke 6:38', text: '"Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you."', prompt: 'What measure are you pouring?' },
  { ref: 'Psalm 67:1-4', text: 'May God be gracious to us and bless us and make his face shine on us... that your ways may be known on earth, your salvation among all nations. May the peoples praise you, O God; may all the peoples praise you.', prompt: 'What salvation can all see?' },
  { ref: 'Proverbs 14:31', text: 'Whoever oppresses the poor shows contempt for their Maker, but whoever is kind to the needy honors God.', prompt: 'How do you honor God?' },
  { ref: 'Psalm 41:1-3', text: 'Blessed are those who have regard for the weak; the Lord delivers them in times of trouble. The Lord protects and preserves them—they are counted among the blessed in the land—he does not give them over to the desire of their foes.', prompt: 'What weak do you regard?' },
  { ref: '2 Corinthians 9:7', text: '"God loves a cheerful giver."', prompt: 'What cheer gives you?' },
  { ref: 'Psalm 146:5-9', text: 'Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God... The Lord gives sight to the blind, the Lord lifts up those who are bowed down, the Lord loves the righteous... The Lord watches over the foreigner.', prompt: 'What sight does God give?' },
  { ref: 'Isaiah 58:10-11', text: '"If you spend yourselves in behalf of the hungry and satisfy the needs of the oppressed, then your light will rise in the darkness, and your night will become like the noonday... The Lord will guide you always.', prompt: 'What darkness is becoming light?' },
  { ref: 'Psalm 24:3-6', text: '"Who may ascend the hill of the Lord? Who may stand in his holy place? The one who has clean hands and a pure heart... Such is the generation of those who seek him, who seek your face, God of Jacob."', prompt: 'What purity are you seeking?' },

  // December (Days 334-364)
  { ref: 'Isaiah 40:1-5', text: '"Comfort, comfort my people, says your God. Speak tenderly to Jerusalem, and proclaim to her that her hard service has been completed... A voice of one calling: \"In the wilderness prepare the way for the Lord; make straight in the desert a highway for our God.\""', prompt: 'What highway are you preparing?' },
  { ref: 'Psalm 25:1-10', text: 'In you, Lord, I have taken refuge; let me never be put to shame; deliver me in your righteousness. Turn your ear to me, come quickly to my rescue... All the ways of the Lord are loving and faithful.', prompt: 'What ways are faithful?' },
  { ref: 'Luke 1:26-38', text: '"Greetings, you who are highly favored! The Lord is with you... Mary asked the angel, \'How will this be, since I am a virgin?\' The angel answered, \'The Holy Spirit will come upon you.\'"', prompt: 'What is God asking of you?' },
  { ref: 'Psalm 84:11-12', text: 'For the Lord God is a sun and shield; the Lord bestows favor and honor; no good thing does he withhold from those whose walk is blameless. Lord Almighty, blessed is the one who trusts in you.', prompt: 'What good does God withhold?' },
  { ref: 'Matthew 1:20-23', text: '"Joseph, son of David, do not be afraid to take Mary home as your wife... They will call him Immanuel (which means \'God with us\')."', prompt: 'How is God with you?' },
  { ref: 'Psalm 96:11-13', text: 'Let the heavens rejoice, let the earth be glad... then all the trees of the forest will sing for joy. They will sing before the Lord, for he comes, he comes to judge the earth.', prompt: 'What judgment are you trusting?' },
  { ref: 'Proverbs 8:22-31', text: '"The Lord brought me forth as the first of his works... I was there when he set the heavens in place... I was filled with delight day after day."', prompt: 'What delight fills creation?' },
  { ref: 'Psalm 98:1-3', text: 'Sing to the Lord a new song, for he has done marvelous things... He has remembered his love and his faithfulness... all the ends of the earth have seen the salvation of our God.', prompt: 'What marvel has God done?' },
  { ref: 'John 1:14', text: '"The Word became flesh and made his dwelling among us. We have seen his glory, the glory of the one and only Son, who came from the Father, full of grace and truth."', prompt: 'What glory do you see?' },
  { ref: 'Psalm 45:1-7', text: '"My heart is stirred by a noble theme... You are the most excellent of men and your lips have been anointed with grace... Your throne, O God, will last for ever and ever."', prompt: 'What throne endures?' },
  { ref: 'Isaiah 9:6-7', text: '"For to us a child is born, to us a son is given... And he will be called Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace. Of the increase of his government and peace there will be no end."', prompt: 'What counseling do you need?' },
  { ref: 'Psalm 72:1-7', text: '"Endow the king with your justice, O God... He will defend the afflicted among the people... May he be like rain falling on a mown field... In his days the righteous will flourish."', prompt: 'What flourishing do you seek?' },
  { ref: 'Luke 2:10-11', text: '"Do not be afraid. I bring you good news that will cause great joy for all the people. Today in the town of David a Savior has been born to you; he is the Messiah, the Lord."', prompt: 'What news brings joy?' },
  { ref: 'Psalm 121:1-8', text: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth... The Lord will watch over your life.', prompt: 'What watching comforts you?' },
  { ref: 'Matthew 2:1-12', text: '"On coming to the house, they saw the child with his mother Mary, and they bowed down and worshiped him. Then they opened their treasures and presented him with gifts.', prompt: 'What gift will you offer?' },
  { ref: 'Psalm 47:1-4', text: 'Clap your hands, all you nations; shout to God with cries of joy. How awesome is the Lord Most High, the great King over all the earth!', prompt: 'What awe do you feel?' },
  { ref: 'Micah 5:2-5', text: '"But you, Bethlehem Ephrathah, though you are small among the clans of Judah, out of you will come for me one who will be ruler over Israel... His greatness will extend to the ends of the earth."', prompt: 'What greatness are you beholding?' },
  { ref: 'Psalm 22:27-31', text: 'All the ends of the earth will remember and turn to the Lord, and all the families of the nations will bow before him. For dominion belongs to the Lord and he rules over the nations.', prompt: 'What dominion is coming?' },
  { ref: 'Revelation 21:3-4', text: '"Now the dwelling of God is with men, and he will dwell with them... He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain.', prompt: 'What suffering will end?' },
  { ref: 'Psalm 2:7-8', text: '"I will proclaim the Lord\'s decree: He said to me, \'You are my Son; today I have become your Father. Ask me, and I will make the nations your inheritance.\"', prompt: 'What inheritance is promised?' },
  { ref: 'Hebrews 1:1-4', text: '"In the past God spoke to our ancestors through the prophets... but in these last days he has spoken to us by his Son... The Son is the radiance of God\'s glory.', prompt: 'What radiance illuminates?' },
  { ref: 'Psalm 110:1-3', text: '"The Lord says to my Lord: \'Sit at my right hand until I make your enemies a footstool for your feet.\'... The Lord has sworn and will not change his mind."', prompt: 'What oath is unbreakable?' },
  { ref: 'Luke 2:28-32', text: '"Simeon took him in his arms and praised God, saying: \'Sovereign Lord, as you have promised, you may now dismiss your servant in peace. For my eyes have seen your salvation, which you have prepared in the sight of all people.\'\"', prompt: 'What peace sees your salvation?' },
  { ref: 'Psalm 132:11-18', text: '"The Lord swore an oath to David... \'One of your own descendants I will place on your throne... His enemies I will clothe with shame, but the crown on his head will be radiant.\'\"', prompt: 'What crown is radiant?' },
  { ref: 'Colossians 1:15-20', text: '"The Son is the image of the invisible God... All things have been created through him and for him... God was pleased to have all his fullness dwell in him, and through him to reconcile to himself all things.', prompt: 'What reconciliation is coming?' },
  { ref: 'Psalm 24:7-10', text: '"Lift up your heads, O gates; be lifted up, you ancient doors, that the King of glory may come in... The King of glory is—the Lord strong and mighty.\"', prompt: 'What glory enters?' },
  { ref: '1 John 4:9-10', text: '"This is how God showed his love among us: He sent his one and only Son into the world that we might live through him... This is love: not that we loved God, but that he loved us.', prompt: 'What love sent the Son?' },
  { ref: 'Psalm 138:1-8', text: 'I give you thanks, O Lord, with all my heart... Your love, O Lord, endures forever—do not abandon the works of your hands.', prompt: 'What hands made you?' },
  { ref: 'Philippians 2:9-11', text: '"Therefore God exalted him to the highest place and gave him the name that is above every name, that at the name of Jesus every knee should bow... and every tongue acknowledge that Jesus Christ is Lord.', prompt: 'What lordship are you acknowledging?' },
  { ref: 'Psalm 149:1-5', text: 'Praise the Lord. Sing to the Lord a new song... Let Israel rejoice in their Maker... Let them sing for joy on their beds... For the Lord takes delight in his people.', prompt: 'What delight do you bring God?' },
];

// 365 daily somatic prompts (one for each day of the year)
// Gentle invitations to embodied presence and body awareness
const DAILY_SOMATIC_PROMPTS_365 = [
  // January (31 days) - Beginning, grounding, foundation
  "Notice where you're holding tension. Breathe into that space.",
  "Place your hand on your heart. Feel it beating. You are alive.",
  "Stand and feel your feet on the ground. You are held.",
  "Close your eyes and listen to your breath. What does it tell you?",
  "Slow your breath by one count. Feel the difference.",
  "Notice the sensation of fabric on your skin. You are present.",
  "Gently roll your shoulders. Release what you're carrying.",
  "Feel your spine lengthening. You are worthy of space.",
  "Press your feet into the earth. Root yourself.",
  "Place both hands on your belly. Breathe deeply.",
  "Notice the ground supporting you. Trust it.",
  "Soften your jaw. Let go of clenching.",
  "Feel the weight of your body in this moment.",
  "Take a breath that's just for you. No one else needs it.",
  "Notice your heartbeat. It's been with you this whole time.",
  "Stretch your arms up slowly. Claim your space.",
  "Rub your hands together. Feel the warmth and aliveness.",
  "Stand taller. Your posture speaks truth.",
  "Feel where your body touches the chair. You are supported.",
  "Walk slowly. Feel each step grounding you.",
  "Notice one sensation in your body right now. Breathe toward it.",
  "Gently massage your temples. Be kind to yourself.",
  "Feel your breath moving through your nostrils. Notice the coolness.",
  "Tense and release your fists. Let go deliberately.",
  "Notice your shoulders. Are they tense? Soften them down.",
  "Feel your whole body held by this moment.",
  "Tilt your head gently side to side. Release your neck.",
  "Press your palms together at heart. Feel your own support.",
  "Breathe in for 4, out for 4. Match yourself to this rhythm.",
  "Notice the sensations around your edges. Where do you begin?",
  "Feel gravity. Let it support you without effort.",
  // February (28 days) - Deepening, softening, listening
  "Slow down one movement today. Feel it fully.",
  "Listen to the silence inside your body. What's there?",
  "Place one hand where you feel most at home in your body.",
  "Notice the natural rhythm of your breath. Don't change it.",
  "Feel your bones beneath your skin. You have an architecture.",
  "Soften everything. Let your face, shoulders, hands go soft.",
  "Walk as if the ground is sacred. Because it is.",
  "Feel your own strength. Stand with it.",
  "Notice where you feel safe in your body.",
  "Gently press the base of your skull. Soften your gaze.",
  "Feel the aliveness in your fingertips.",
  "Notice your spine, your core, your center.",
  "Breathe in trust. Breathe out fear.",
  "Feel your feet. They've walked your whole journey.",
  "Close your eyes. Sense the space around you.",
  "Feel your collarbones. They hold weight with grace.",
  "Notice any trembling. It's your body speaking.",
  "Breathe into your lower belly. Feel it expand.",
  "Release your grip on something. Feel the difference.",
  "Feel the pulse in your neck. You are alive.",
  "Notice your hands. What have they done with love?",
  "Soften your belly. Let it be vulnerable.",
  "Feel the back of your body being supported.",
  "Take a breath that goes all the way to your sitting bones.",
  "Notice where light touches your skin.",
  "Feel your whole body as one connected thing.",
  "Breathe as if your body is grateful for each breath.",
  "Feel your roots going deep. You can lean on them.",
  // March (31 days) - Awakening, moving, renewal
  "Notice one part of your body awakening.",
  "Stretch your arms slowly. Claim the space around you.",
  "Feel your legs grounding you. They are strong.",
  "Breathe as if spring is entering your lungs.",
  "Notice your face. Soften the edges.",
  "Feel the aliveness in your whole body.",
  "Walk with awareness. Each step is a choice.",
  "Notice where your body wants to move.",
  "Feel the strength in your core.",
  "Breathe into your side body. Feel it expand.",
  "Notice the natural curves of your spine.",
  "Feel your whole back body waking up.",
  "Gentle roll your head. Release what's stuck.",
  "Feel the strength in your legs.",
  "Breathe awareness into your hands.",
  "Notice your fingers, your palms, your wrists.",
  "Feel your body as a whole system working for you.",
  "Soften your eyes. Look gently at the world.",
  "Feel the length of your spine.",
  "Notice any vibration in your body.",
  "Breathe into your belly. Feel it rise and fall.",
  "Feel your body's wisdom. It knows things.",
  "Stretch toward the sky. You deserve to expand.",
  "Feel the strength of your foundation.",
  "Notice where you feel most connected to yourself.",
  "Breathe as if you're breathing in the season.",
  "Feel your body as a home you get to inhabit.",
  "Notice your heartbeat. It's been faithful.",
  "Feel the ground rising up to meet you.",
  "Breathe in transformation. Breathe out resistance.",
  "Feel your whole body as a prayer.",
  // April (30 days) - Resurrection, rising, opening
  "Feel yourself rising. You have inner strength.",
  "Notice what wants to open in you.",
  "Breathe as if you're breathing in new life.",
  "Feel your chest opening. Let yourself expand.",
  "Notice the strength of your shoulders.",
  "Feel your body light and free.",
  "Breathe into your heart space. What's there?",
  "Notice your legs carrying you forward.",
  "Feel the aliveness in your whole spine.",
  "Stretch toward what's possible.",
  "Feel your body capable and strong.",
  "Breathe awareness through your whole self.",
  "Notice where you feel most alive.",
  "Feel your body as resilient.",
  "Breathe in possibility. Breathe out old stories.",
  "Feel yourself standing tall and true.",
  "Notice your body's capacity for healing.",
  "Feel the strength of your legs grounding you.",
  "Breathe as if you've already risen.",
  "Feel your whole body radiant.",
  "Notice what's ready to bloom in you.",
  "Feel the power of your own presence.",
  "Breathe in courage. Breathe out doubt.",
  "Feel your body strong and beautiful.",
  "Notice the resilience you carry.",
  "Feel yourself opening to what's possible.",
  "Breathe deeply into your strength.",
  "Feel your body as an instrument of grace.",
  "Notice your capacity to transform.",
  "Feel yourself fully alive in this moment.",
  // May (31 days) - Spiraling, flowing, receiving
  "Feel the spiral of energy in your body.",
  "Notice how you receive what comes to you.",
  "Breathe as if you're breathing in abundance.",
  "Feel yourself open to receive.",
  "Notice the flow of your own aliveness.",
  "Feel your body as a vessel for life.",
  "Breathe in gratitude for your body.",
  "Notice where you hold most tightly. Soften there.",
  "Feel the natural flow of your breath.",
  "Breathe as if you're spiraling toward wholeness.",
  "Feel your body's capacity to feel.",
  "Notice what you're ready to receive.",
  "Feel yourself held by something larger.",
  "Breathe into openness.",
  "Feel the spiraling energy moving through you.",
  "Notice your body's own wisdom.",
  "Feel yourself floating, light, free.",
  "Breathe as if the universe is breathing with you.",
  "Feel your whole body glowing.",
  "Notice the generosity of your own being.",
  "Feel yourself receiving exactly what you need.",
  "Breathe into trust and ease.",
  "Feel your body pulsing with life.",
  "Notice where you're becoming more yourself.",
  "Feel the grace moving through you.",
  "Breathe as if you're breathing for the first time.",
  "Feel yourself spiraling into wholeness.",
  "Notice your body's own song.",
  "Feel yourself home in your own skin.",
  "Breathe in the gift of being alive.",
  "Feel your whole being blooming.",
  // June (30 days) - Grounding, steadying, rooting
  "Feel your roots going deep into the earth.",
  "Notice your connection to something solid.",
  "Breathe as if the earth is supporting you.",
  "Feel your feet fully on the ground.",
  "Notice your steadiness. You can be still.",
  "Feel your body as solid and strong.",
  "Breathe into your foundation.",
  "Feel yourself rooted and true.",
  "Notice the stability within you.",
  "Breathe as if you're breathing with the earth.",
  "Feel your whole body grounded.",
  "Notice where you feel most steady.",
  "Feel yourself held by gravity.",
  "Breathe into your core strength.",
  "Feel the solidity of your bones.",
  "Notice your stability even in movement.",
  "Feel yourself planted where you are.",
  "Breathe as if you have nothing to prove.",
  "Feel your body's own authority.",
  "Notice the strength of your stance.",
  "Feel yourself rooted in the present moment.",
  "Breathe into stillness.",
  "Feel the earth rising up to meet you.",
  "Notice your capacity to be grounded.",
  "Feel yourself stable and sure.",
  "Breathe as if you're breathing roots deep.",
  "Feel your whole body steady.",
  "Notice your own inner stability.",
  "Feel the power of staying put.",
  "Breathe in groundedness. Breathe out restlessness.",
  // July (31 days) - Expansion, strength, radiance
  "Feel yourself expanding in all directions.",
  "Notice your own radiance.",
  "Breathe as if you're breathing in light.",
  "Feel your strength at its peak.",
  "Notice the brilliance of your own being.",
  "Feel yourself taking up space.",
  "Breathe into your full power.",
  "Feel your body as radiant.",
  "Notice your capacity for greatness.",
  "Breathe as if you're breathing fire.",
  "Feel yourself burning bright.",
  "Notice where you're most alive.",
  "Feel your strength flowing through you.",
  "Breathe in your own brightness.",
  "Feel your whole body luminous.",
  "Notice your fierce beauty.",
  "Feel yourself fully in your power.",
  "Breathe as if you're the sun.",
  "Feel your radiance touching everything around you.",
  "Notice your unstoppable strength.",
  "Feel yourself magnetic and alive.",
  "Breathe into your full expression.",
  "Feel your body as a beacon of light.",
  "Notice your unique brilliance.",
  "Feel yourself strong enough for anything.",
  "Breathe as if you're breathing in summer.",
  "Feel your whole being glowing.",
  "Notice your capacity to shine.",
  "Feel the fire within you.",
  "Breathe in strength. Breathe out doubt.",
  "Feel yourself fully expanded into life.",
  // August (31 days) - Ripening, sweetening, deepening
  "Feel yourself ripening into wholeness.",
  "Notice the sweetness in your own being.",
  "Breathe as if you're breathing in honey.",
  "Feel your body becoming richer.",
  "Notice the depth of your own presence.",
  "Feel yourself maturing into wisdom.",
  "Breathe into your own sweetness.",
  "Feel your beauty deepening.",
  "Notice what you're becoming.",
  "Breathe as if you're breathing abundance.",
  "Feel yourself luxurious and full.",
  "Notice the richness of your own life.",
  "Feel your body glowing with health.",
  "Breathe in your own worth.",
  "Feel yourself sweet and strong.",
  "Notice your increasing confidence.",
  "Feel yourself at the height of your power.",
  "Breathe as if you're breathing nectar.",
  "Feel your whole being nourished.",
  "Notice what you've created.",
  "Feel yourself blessed and full.",
  "Breathe into the harvest of your life.",
  "Feel your body as the fruit of your efforts.",
  "Notice your own abundance.",
  "Feel yourself ripe and ready.",
  "Breathe as if every breath is precious.",
  "Feel your whole being rich.",
  "Notice the gold in your own presence.",
  "Feel yourself sweet as the season.",
  "Breathe in gratitude for your body.",
  "Feel yourself fully ripened into grace.",
  // September (30 days) - Gathering, preparing, releasing
  "Feel yourself gathering your power.",
  "Notice what you're ready to release.",
  "Breathe as if you're preparing for transition.",
  "Feel yourself stable as seasons shift.",
  "Notice what you want to keep.",
  "Feel yourself wise enough to let go.",
  "Breathe into your own discernment.",
  "Feel yourself collecting your gifts.",
  "Notice what serves you and what doesn't.",
  "Breathe as if you're breathing in clarity.",
  "Feel yourself ready for change.",
  "Notice your capacity to transform.",
  "Feel yourself grounded even as things shift.",
  "Breathe in what nourishes you.",
  "Feel yourself gathering strength.",
  "Notice what you're ready to harvest.",
  "Feel yourself wise and discerning.",
  "Breathe as if you're breathing in transition.",
  "Feel yourself both holding and releasing.",
  "Notice your own grace in change.",
  "Feel yourself prepared for what's next.",
  "Breathe into acceptance.",
  "Feel your body as solid in the shift.",
  "Notice what you're gathering into.",
  "Feel yourself ready to let go.",
  "Breathe as if change is breath itself.",
  "Feel your whole being adjusting gracefully.",
  "Notice your wisdom in transitions.",
  "Feel yourself strong enough to release.",
  "Breathe in trust for what's coming.",
  // October (31 days) - Celebrating, honoring, witnessing
  "Feel yourself worthy of celebration.",
  "Notice all you've accomplished.",
  "Breathe as if you're breathing in recognition.",
  "Feel your body honored and seen.",
  "Notice the gifts you carry.",
  "Feel yourself blessed and grateful.",
  "Breathe into appreciation.",
  "Feel yourself celebrated for being alive.",
  "Notice what you've overcome.",
  "Breathe as if you're breathing in honor.",
  "Feel yourself witnessed in your wholeness.",
  "Notice your own beauty and strength.",
  "Feel yourself deserving of good things.",
  "Breathe in deep gratitude.",
  "Feel your whole body celebrated.",
  "Notice your unique gifts.",
  "Feel yourself honored as you are.",
  "Breathe as if the universe celebrates you.",
  "Feel yourself fully seen and loved.",
  "Notice what makes you proud.",
  "Feel yourself worthy of everything good.",
  "Breathe into self-honor.",
  "Feel your body as a victory.",
  "Notice your own sacred journey.",
  "Feel yourself blessed beyond measure.",
  "Breathe as if every cell is celebrated.",
  "Feel your whole being honored.",
  "Notice the miracle of your own existence.",
  "Feel yourself glowing with gratitude.",
  "Breathe in reverence for your life.",
  "Feel yourself celebrated and whole.",
  // November (30 days) - Thanking, receiving, abundance
  "Feel your whole body grateful.",
  "Notice what you have to be thankful for.",
  "Breathe as if you're breathing in thanks.",
  "Feel yourself rich in love.",
  "Notice all the abundance around you.",
  "Feel yourself receiving with grace.",
  "Breathe into openness and gratitude.",
  "Feel your body nourished and fed.",
  "Notice the gifts in your life.",
  "Breathe as if you're breathing thanksgiving.",
  "Feel yourself overflowing with gratitude.",
  "Notice the blessings you often miss.",
  "Feel your heart full to bursting.",
  "Breathe in deep thanksgiving.",
  "Feel yourself held in abundance.",
  "Notice the generosity of your own being.",
  "Feel yourself blessed in every way.",
  "Breathe as if gratitude is your breath.",
  "Feel your whole being grateful.",
  "Notice what abundance means to you.",
  "Feel yourself rich beyond measure.",
  "Breathe into receiving fully.",
  "Feel your body as abundance itself.",
  "Notice the gifts that keep giving.",
  "Feel yourself grateful for the journey.",
  "Breathe as if you're breathing blessings.",
  "Feel your whole being overflowing.",
  "Notice the wealth of your own heart.",
  "Feel yourself blessed and grateful.",
  "Breathe in deep thanks for being alive.",
  // December (31 days) - Waiting, hoping, preparing, celebrating
  "Feel yourself in sacred waiting.",
  "Notice the hope within you.",
  "Breathe as if you're breathing in anticipation.",
  "Feel your body preparing for what's coming.",
  "Notice your own inner light.",
  "Feel yourself glowing in the darkness.",
  "Breathe into patient hope.",
  "Feel yourself as a beacon of light.",
  "Notice what you're waiting for.",
  "Breathe as if light itself is entering.",
  "Feel yourself radiant even in winter.",
  "Notice the light within you never goes out.",
  "Feel your body warm and alive.",
  "Breathe in the gift of hope.",
  "Feel yourself celebrating in the darkness.",
  "Notice the light that you are.",
  "Feel yourself blessed and hopeful.",
  "Breathe as if you're breathing in the season.",
  "Feel your whole being luminous.",
  "Notice what wants to be born in you.",
  "Feel yourself preparing for renewal.",
  "Breathe into sacred waiting.",
  "Feel your body as a chalice for light.",
  "Notice the hope that persists.",
  "Feel yourself celebrating the darkness and the light.",
  "Breathe as if every breath brings you closer.",
  "Feel your whole being filled with holy anticipation.",
  "Notice the miracle that's coming.",
  "Feel yourself as part of something holy.",
  "Breathe in deep hope. Breathe out fear.",
  "Feel yourself waiting in joy for what's coming.",
];

// Liturgical calendar data for 52 weeks
const LITURGICAL_THEMES = [
  {
    season: 'Advent',
    title: 'The Weight I\'m Carrying',
    description: 'In the stillness before Christmas, we pause to feel what we\'ve been holding. What burdens do we carry? What waits to be laid down?',
  },
  {
    season: 'Advent',
    title: 'Watching in the Dark',
    description: 'Advent teaches us to wait. To keep watch. To trust even when we cannot see what\'s coming.',
  },
  {
    season: 'Advent',
    title: 'Breath Before the Promise',
    description: 'As we near Christmas, we breathe. We pause. We make space for the holy to arrive.',
  },
  {
    season: 'Advent',
    title: 'Opening Our Hands',
    description: 'Advent invites us to open our hands—to receive, to let go, to become vessels.',
  },
  {
    season: 'Christmas',
    title: 'The Incarnate Touch',
    description: 'God became flesh. Born. Vulnerable. Held in human hands. What does it mean that the Divine entered our bodies?',
  },
  {
    season: 'Christmas',
    title: 'Joy Embodied',
    description: 'Christmas is a somatic feast. We celebrate with bodies—with warmth, with music, with embrace.',
  },
  {
    season: 'Epiphany',
    title: 'The Star We Follow',
    description: 'Epiphany calls us to follow the light. To notice what guides us. To journey toward the holy.',
  },
  {
    season: 'Epiphany',
    title: 'Manifestation of Light',
    description: 'God is revealed. The Light becomes visible. We see what was hidden.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Everyday Sacred',
    description: 'In ordinary time, we discover that the sacred lives in the everyday. In breath, in rest, in presence.',
  },
  {
    season: 'Ordinary Time',
    title: 'Growth and Becoming',
    description: 'Like seeds in soil, we grow. We become. We trust the slow work of grace.',
  },
  {
    season: 'Lent',
    title: 'The Journey Inward',
    description: 'Lent invites us to turn toward our inner wilderness. To face what we\'ve avoided. To find Christ there.',
  },
  {
    season: 'Lent',
    title: 'Desert Compassion',
    description: 'In the desert of Lent, we strip away distractions. We meet ourselves honestly. We meet Christ.',
  },
  {
    season: 'Lent',
    title: 'Dying to Self',
    description: 'Lent asks: What must die in us? What habits, fears, false selves must we release?',
  },
  {
    season: 'Lent',
    title: 'The Long Road to Resurrection',
    description: 'As we approach Easter, we walk with Christ toward the cross. We practice surrender. We trust.',
  },
  {
    season: 'Holy Week',
    title: 'The Passion of the Body',
    description: 'Holy Week is visceral. We follow Christ through suffering. We feel the weight of the cross.',
  },
  {
    season: 'Holy Week',
    title: 'The Stillness of Holy Saturday',
    description: 'In the tomb with Christ, we rest. We wait. We trust the resurrection.',
  },
  {
    season: 'Easter',
    title: 'Resurrection Body',
    description: 'Christ rises bodily. The Resurrection is not escape from the body, but transformation of it.',
  },
  {
    season: 'Easter',
    title: 'New Life Breaking Through',
    description: 'Easter bursts forth. New life erupts. We celebrate resurrection in every form.',
  },
  {
    season: 'Easter',
    title: 'The Risen Christ Appears',
    description: 'The Risen Christ appears to us—in breaking bread, in wounds transformed, in presence.',
  },
  {
    season: 'Easter',
    title: 'Ascension and Presence',
    description: 'Christ ascends, yet remains. God\'s presence is both transcendent and intimate.',
  },
  {
    season: 'Pentecost',
    title: 'The Spirit\'s Fire',
    description: 'Pentecost sets us ablaze. The Holy Spirit falls. We are filled. We are sent.',
  },
  {
    season: 'Pentecost',
    title: 'The Breath of God',
    description: 'Ruach. Wind. Breath. The Holy Spirit moves through us, animating, vivifying.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Kingdom Among Us',
    description: 'In ordinary time after Pentecost, we live as the kingdom. We embody Christ\'s love.',
  },
  {
    season: 'Ordinary Time',
    title: 'Bearing Fruit',
    description: 'As branches on the vine, we bear fruit. Love, joy, peace, patience—the fruits of the Spirit.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Fruit of the Spirit',
    description: 'Galatians 5: Love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.',
  },
  {
    season: 'Ordinary Time',
    title: 'Feeding the Hungry',
    description: 'Christ in the hungry, thirsty, stranger, naked, sick, imprisoned. We see Him in the other.',
  },
  {
    season: 'Ordinary Time',
    title: 'Welcoming the Stranger',
    description: 'Hospitality is a spiritual practice. We welcome Christ in the stranger.',
  },
  {
    season: 'Ordinary Time',
    title: 'Healing Hands',
    description: 'Jesus healed with touch. His hands were instruments of wholeness. We are called to heal.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Teacher\'s Wisdom',
    description: 'We sit at Jesus\'s feet and learn. His teachings reorient our bodies, our minds, our hearts.',
  },
  {
    season: 'Ordinary Time',
    title: 'Following the Way',
    description: 'Jesus called us to follow. Not just intellectually, but with our bodies, our time, our love.',
  },
  {
    season: 'Ordinary Time',
    title: 'Prayer and Presence',
    description: 'Prayer is the breath of the spiritual life. In prayer, we meet God face to face.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Beatitudes',
    description: 'Blessed are the poor, mourning, meek, hungry, merciful, pure, peacemakers, persecuted.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Greatest Commandment',
    description: 'Love the Lord your God with all your heart, soul, mind. Love your neighbor as yourself.',
  },
  {
    season: 'Ordinary Time',
    title: 'Sabbath Rest',
    description: 'God rested on the seventh day. We are invited to rest, to cease, to remember.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Cross Daily',
    description: 'We take up our cross daily. We practice dying to self. We follow.',
  },
  {
    season: 'Ordinary Time',
    title: 'Community and Communion',
    description: 'We are not alone. We gather. We break bread. We become the body of Christ.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Incarnational Life',
    description: 'The Word became flesh. We too live incarnationally—spirit and body, together.',
  },
  {
    season: 'Ordinary Time',
    title: 'Grace and Forgiveness',
    description: 'By grace we are saved. In grace, we forgive ourselves and others.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Presence of Christ',
    description: 'Christ is present—in the Eucharist, in community, in the poor, in our own hearts.',
  },
  {
    season: 'Ordinary Time',
    title: 'Mercy and Justice',
    description: 'God desires mercy. We are called to do justice and love kindness.',
  },
  {
    season: 'Ordinary Time',
    title: 'Hope in Darkness',
    description: 'Even in darkness, Christ is light. Even in despair, hope remains.',
  },
  {
    season: 'Ordinary Time',
    title: 'Faith and Doubt',
    description: 'Faith doesn\'t mean certainty. We believe even in uncertainty, even in doubt.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Resurrection Daily',
    description: 'Each day is a resurrection. Each morning, Christ\'s power breaks through death.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Love of God',
    description: 'Nothing can separate us from the love of God. We are loved. Completely. Always.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Generous Heart',
    description: 'God gave freely. We give freely. Generosity is spiritual practice.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Singing Life',
    description: 'Joy and music mark the spiritual life. We sing even in sorrow.',
  },
  {
    season: 'Ordinary Time',
    title: 'Beauty and Wonder',
    description: 'Creation sings of God\'s glory. We too are called to create, to wonder, to delight.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Contemplative Heart',
    description: 'We pause. We observe. We listen. We become aware of God\'s presence.',
  },
  {
    season: 'Ordinary Time',
    title: 'Service and Humility',
    description: 'Christ washed feet. We serve. We become last so that others can be first.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Beloved Community',
    description: 'We are family in Christ. We love as brothers and sisters. We belong.',
  },
  {
    season: 'Ordinary Time',
    title: 'All Saints\' Communion',
    description: 'We are surrounded by a great cloud of witnesses. We join the communion of saints.',
  },
  {
    season: 'Ordinary Time',
    title: 'The End and the Beginning',
    description: 'All things end. All things begin anew. Christ is alpha and omega.',
  },
  {
    season: 'Advent',
    title: 'Return and Renewal',
    description: 'As Advent returns, we return to waiting, to hope, to preparation.',
  },
  {
    season: 'Advent',
    title: 'The Second Coming',
    description: 'We wait for Christ\'s return. We live in the already-not-yet. We hope.',
  },
];

// Daily scriptures for each week and day
const DAILY_SCRIPTURES: Record<string, Record<number, { ref: string; text: string; prompt: string }>> = {
  // Week 1 (Advent)
  'Advent-1': {
    0: {
      ref: 'Isaiah 2:1-5',
      text: 'In the last days, the mountain of the Lord\'s temple will be established as the highest of the mountains. All nations will stream to it.',
      prompt: 'What mountains in your life are being leveled? What height is calling to you?',
    },
    1: {
      ref: 'Romans 13:11-14',
      text: 'The night is nearly over; the day is almost here. So let us put aside the deeds of darkness and put on the armor of light.',
      prompt: 'What deeds of darkness are ready to be released? What light are you stepping toward?',
    },
    2: {
      ref: 'Matthew 24:37-44',
      text: 'As it was in the days of Noah, so it will be at the coming of the Son of Man.',
      prompt: 'In the midst of ordinary life, are you watching? Are you awake?',
    },
    3: {
      ref: 'Luke 21:25-36',
      text: 'There will be signs in the sun, moon and stars. On earth, nations will be in anguish and perplexity.',
      prompt: 'What signs are you noticing? What perplexities are you holding?',
    },
    4: {
      ref: 'Psalm 25:1-10',
      text: 'To you, O Lord, I lift up my soul. In you I trust. Show me your ways and teach me your paths.',
      prompt: 'Lift your soul with the psalmist. What ways is God showing you?',
    },
    5: {
      ref: '1 Corinthians 1:3-9',
      text: 'As you wait for our Lord Jesus Christ to be revealed, he will keep you firm to the end.',
      prompt: 'What does it feel like to be held firm by God\'s grace?',
    },
    6: {
      ref: 'Philippians 1:3-11',
      text: 'I am confident of this: that he who began a good work in you will carry it on to completion.',
      prompt: 'What good work is God beginning in you? Can you sense it stirring?',
    },
  },
};

// Helper to get daily content for a theme
function getDailyContent(seasonWeek: string, dayOfWeek: number) {
  const key = Object.keys(DAILY_SCRIPTURES).find((k) => k.startsWith(seasonWeek.split('-')[0]));
  if (!key || !DAILY_SCRIPTURES[key]?.[dayOfWeek]) {
    return {
      ref: 'Psalm 46:10',
      text: 'Be still, and know that I am God.',
      prompt: 'In stillness, what do you notice? What is God saying to you?',
    };
  }
  return DAILY_SCRIPTURES[key][dayOfWeek];
}

export function registerWeeklyThemeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Get current weekly theme with daily scripture
  app.fastify.get(
    '/api/weekly-theme/current',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info('Fetching current weekly theme');

      try {
        // Get all themes ordered by weekStartDate
        const allThemes = await app.db
          .select()
          .from(schema.weeklyThemes)
          .orderBy(schema.weeklyThemes.weekStartDate);

        if (!allThemes.length) {
          app.logger.error({}, 'No themes exist in database');
          return reply.status(404).send({ error: 'No theme available' });
        }

        // Calculate which week (0-51) we're in
        const currentWeekIndex = getCurrentWeekIndex();
        app.logger.info({ currentWeekIndex, totalThemes: allThemes.length }, 'Calculated current week index');

        // Get the theme at the current week index (with wraparound for 52-week cycle)
        const themeIndex = currentWeekIndex % allThemes.length;
        let theme = allThemes[themeIndex];

        // Ensure the theme has a featuredExerciseId; if not, assign one randomly
        if (!theme.featuredExerciseId) {
          app.logger.warn({ themeId: theme.id, themeTitle: theme.themeTitle }, 'Theme missing featured exercise, assigning one');

          const allExercises = await app.db
            .select()
            .from(schema.somaticExercises);

          if (allExercises.length > 0) {
            const randomExercise = allExercises[Math.floor(Math.random() * allExercises.length)];
            theme = {
              ...theme,
              featuredExerciseId: randomExercise.id,
            };

            // Update the database with the assigned exercise
            await app.db
              .update(schema.weeklyThemes)
              .set({ featuredExerciseId: randomExercise.id })
              .where(eq(schema.weeklyThemes.id, theme.id));

            app.logger.info({ themeId: theme.id, exerciseId: randomExercise.id }, 'Assigned random exercise to theme');
          }
        }

        // Get current day of week in Pacific Time (0=Sunday, 1=Monday, ..., 6=Saturday)
        const now = new Date();
        const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const currentDayOfWeek = pacificTime.getDay();

        // Get the unique scripture for this day of the year (0-364) - ALWAYS calculate fresh
        const dayOfYear = getDayOfYear();

        app.logger.info(
          {
            utcTime: now.toISOString(),
            pacificTimeString: pacificTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
            pacificYear: pacificTime.getFullYear(),
            pacificMonth: pacificTime.getMonth() + 1,
            pacificDay: pacificTime.getDate(),
            dayOfWeek: currentDayOfWeek,
            dayOfYear,
          },
          'Pacific Time details for daily scripture calculation'
        );

        // ALWAYS generate daily content from the 365-day scripture cycle
        // Do NOT use database content - the DAILY_SCRIPTURES_365 array is the source of truth
        app.logger.info(
          {
            themeId: theme.id,
            weekIndex: currentWeekIndex,
            dayOfWeek: currentDayOfWeek,
            dayOfYear,
          },
          'Generating daily content from 365-day scripture cycle'
        );

        const dayTitles = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayTitles[currentDayOfWeek];

        // Get the unique scripture for this day of the year (0-364)
        const dailyScripture = DAILY_SCRIPTURES_365[dayOfYear];

        if (!dailyScripture) {
          app.logger.error(
            { dayOfYear, arrayLength: DAILY_SCRIPTURES_365.length },
            'ERROR: Daily scripture not found for dayOfYear'
          );
          throw new Error(`Daily scripture not found for day ${dayOfYear}`);
        }

        // Get the somatic prompt for this day of year
        const dailySomaticPrompt = DAILY_SOMATIC_PROMPTS_365[dayOfYear];

        if (!dailySomaticPrompt) {
          app.logger.error(
            { dayOfYear, arrayLength: DAILY_SOMATIC_PROMPTS_365.length },
            'ERROR: Daily somatic prompt not found for dayOfYear'
          );
          throw new Error(`Daily somatic prompt not found for day ${dayOfYear}`);
        }

        // Create daily content object from 365-day scripture cycle
        const dailyContent = {
          id: null,
          dayOfWeek: currentDayOfWeek,
          dayTitle: dayName,
          scriptureReference: dailyScripture.ref,
          scriptureText: dailyScripture.text,
          reflectionPrompt: dailyScripture.prompt,
          somaticPrompt: dailySomaticPrompt,
          dayOfYear, // Include dayOfYear in content
        };

        app.logger.info(
          {
            themeId: theme.id,
            dayOfYear,
            dayOfWeek: currentDayOfWeek,
            scriptureRef: dailyScripture.ref,
            scriptureText: dailyScripture.text.substring(0, 100),
            somaticPrompt: dailySomaticPrompt.substring(0, 50),
          },
          'Daily content generated from 365-day scripture cycle'
        );

        // Get featured somatic exercise if exists
        let featuredExercise = null;
        if (theme.featuredExerciseId) {
          const exerciseData = await app.db
            .select()
            .from(schema.somaticExercises)
            .where(eq(schema.somaticExercises.id, theme.featuredExerciseId))
            .limit(1);
          if (exerciseData.length) {
            featuredExercise = exerciseData[0];
          }
        }

        app.logger.info(
          { themeId: theme.id, weekIndex: currentWeekIndex, dayOfWeek: currentDayOfWeek, weekStartDate: theme.weekStartDate },
          'Current weekly theme retrieved'
        );

        // Format the response with all daily content fields
        const responseContent = {
          id: dailyContent.id,
          dayOfWeek: dailyContent.dayOfWeek,
          dayTitle: dailyContent.dayTitle,
          scriptureReference: dailyContent.scriptureReference,
          scriptureText: dailyContent.scriptureText,
          reflectionQuestion: dailyContent.reflectionPrompt,
          somaticPrompt: dailyContent.somaticPrompt || null,
          dayOfYear: dailyContent.dayOfYear, // Always include dayOfYear
        };

        app.logger.info(
          {
            dayOfYear: responseContent.dayOfYear,
            scriptureRef: responseContent.scriptureReference,
          },
          'Returning weekly theme with daily content'
        );

        return reply.send({
          weeklyTheme: {
            id: theme.id,
            weekStartDate: theme.weekStartDate,
            liturgicalSeason: theme.liturgicalSeason,
            themeTitle: theme.themeTitle,
            themeDescription: theme.themeDescription,
            featuredExerciseId: theme.featuredExerciseId || null,
            reflectionPrompt: theme.reflectionPrompt || null,
            somaticExercise: featuredExercise,
          },
          dailyContent: responseContent,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch current weekly theme');
        throw error;
      }
    }
  );

  // Seed weekly themes (admin endpoint)
  app.fastify.post(
    '/api/weekly-theme/seed',
    async (
      request: FastifyRequest<{ Body: { startDate?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      app.logger.info('Seeding weekly themes');

      try {
        // Check if themes already exist
        const existing = await app.db
          .select()
          .from(schema.weeklyThemes)
          .limit(1);

        if (existing.length > 0) {
          app.logger.info('Weekly themes already seeded');
          return reply.send({
            message: 'Weekly themes already seeded',
            themesCreated: 0,
          });
        }

        const startDate = request.body.startDate
          ? new Date(request.body.startDate)
          : new Date(getNextSundayPacific());

        startDate.setHours(0, 0, 0, 0);

        const themesToCreate = [];
        for (let i = 0; i < LITURGICAL_THEMES.length; i++) {
          const themeData = LITURGICAL_THEMES[i];
          const weekDate = new Date(startDate);
          weekDate.setDate(weekDate.getDate() + i * 7);

          const themeRecord = {
            weekStartDate: weekDate.toISOString().split('T')[0],
            liturgicalSeason: themeData.season,
            themeTitle: themeData.title,
            themeDescription: themeData.description,
          };

          themesToCreate.push(themeRecord);
        }

        // Create themes in batches
        const createdThemes = await app.db
          .insert(schema.weeklyThemes)
          .values(themesToCreate)
          .returning();

        // Create daily content for each theme
        for (let i = 0; i < createdThemes.length; i++) {
          const themeId = createdThemes[i].id;
          const seasonWeek = `${createdThemes[i].liturgicalSeason}-${i + 1}`;

          const dailyContent = [];
          for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const content = getDailyContent(seasonWeek, dayOfWeek);
            dailyContent.push({
              weeklyThemeId: themeId,
              dayOfWeek,
              scriptureReference: content.ref,
              scriptureText: content.text,
              reflectionPrompt: content.prompt,
            });
          }

          await app.db.insert(schema.dailyContent).values(dailyContent);
        }

        app.logger.info({ themesCreated: createdThemes.length }, 'Weekly themes seeded successfully');

        return reply.status(201).send({
          message: `Created ${createdThemes.length} weekly themes with daily content`,
          themesCreated: createdThemes.length,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to seed weekly themes');
        throw error;
      }
    }
  );
}
