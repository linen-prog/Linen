import type { App } from '../index.js';
import * as schema from '../db/schema.js';

// Utility function to get next Monday in Pacific Time (week start)
function getNextMondayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);

  // Calculate days to next Monday
  // If Monday (1), go to next Monday (add 7 days)
  // If Sunday (0), go to next day which is Monday (add 1 day)
  // Otherwise add days until Monday
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

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
    title: 'The Wilderness Fast',
    description: 'As Jesus fasted in the wilderness, we too fast. We clear space. We wait.',
  },
  {
    season: 'Lent',
    title: 'Toward the Cross',
    description: 'Lent brings us to the foot of the cross. We stand with Christ in his suffering. We stand with our own.',
  },
  {
    season: 'Holy Week',
    title: 'Palm Sunday: Welcomed, Then Forsaken',
    description: 'The crowds wave palms, then scatter. What does it feel like to be both celebrated and abandoned?',
  },
  {
    season: 'Holy Week',
    title: 'Holy Thursday: Feet and Bread',
    description: 'Jesus washes feet. Jesus breaks bread. In these acts, divinity touches human bodies.',
  },
  {
    season: 'Easter',
    title: 'Resurrection Embodied',
    description: 'Jesus rose. His body—marked, scarred, real—was resurrected. Death does not have the final word.',
  },
  {
    season: 'Easter',
    title: 'The Gardener We Mistook',
    description: 'Mary meets the risen Jesus but doesn\'t recognize him. She thinks he\'s the gardener. What does resurrection look like?',
  },
  {
    season: 'Easter',
    title: 'Peace in Wounds',
    description: 'The risen Jesus appears and shows his wounds. Peace comes not from their erasure, but from their transformation.',
  },
  {
    season: 'Easter',
    title: 'Catching the Uncatchable',
    description: 'The disciples catch 153 fish. Abundance. Provision. A return to work, to life, to purpose.',
  },
  {
    season: 'Ascension',
    title: 'Released and Sent',
    description: 'Jesus ascends. He releases us. He sends us the Spirit. We are not orphaned but equipped.',
  },
  {
    season: 'Pentecost',
    title: 'Breath and Fire',
    description: 'The Spirit comes like wind and fire. We receive the breath we\'ve been holding. We are ignited.',
  },
  {
    season: 'Ordinary Time',
    title: 'Learning to Forgive',
    description: 'Forgiveness is not forgetting. It is the hard work of release, the practice of letting go.',
  },
  {
    season: 'Ordinary Time',
    title: 'Love Your Enemies',
    description: 'Jesus asks the unaskable: love those who harm you. What would embodying this love look like?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Prodigal\'s Return',
    description: 'The father runs. He embraces. He rejoices. Where do we experience such wild, unreserved welcome?',
  },
  {
    season: 'Ordinary Time',
    title: 'Hospitality and the Stranger',
    description: 'We entertain angels unaware. The stranger may be Christ. How do we welcome the unknown?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Good Samaritan',
    description: 'He stopped. He saw. He acted. What does it cost to truly help another person?',
  },
  {
    season: 'Ordinary Time',
    title: 'Martha and Mary',
    description: 'Martha bustles; Mary sits. Both have something to teach us about presence and service.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Beatitudes: Blessed Are',
    description: 'Blessed are the poor. The grieving. The gentle. The hungry. Jesus turns the world\'s values upside down.',
  },
  {
    season: 'Ordinary Time',
    title: 'Salt and Light',
    description: 'We are salt and light. We preserve. We illuminate. We make visible what was hidden.',
  },
  {
    season: 'Ordinary Time',
    title: 'Building on Rock',
    description: 'When the storms come, what foundation holds? What practices keep us steady?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Sower and the Seeds',
    description: 'Some seeds fall on rocky soil, some among thorns, some on good ground. Where are we being planted?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Mustard Seed',
    description: 'From the smallest seed grows the largest plant. What small things are we underestimating?',
  },
  {
    season: 'Ordinary Time',
    title: 'Treasure in Fields',
    description: 'The kingdom is like treasure hidden in a field. What are we willing to give up to find it?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Narrow Gate',
    description: 'The way is narrow, but those who find it live. What barriers must we pass through?',
  },
  {
    season: 'Ordinary Time',
    title: 'Bearing One Another\'s Burdens',
    description: 'We do not walk alone. Others carry us; we carry others. This is the body of Christ.',
  },
  {
    season: 'Ordinary Time',
    title: 'Feeding the Five Thousand',
    description: 'Five loaves. Two fish. The disciples thought there wasn\'t enough. Jesus knew differently.',
  },
  {
    season: 'Ordinary Time',
    title: 'Walking on Water',
    description: '"Do not be afraid." Peter steps out of the boat. Faith and doubt dance together.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Transfiguration',
    description: 'Jesus shines brighter than the sun. For a moment, the disciples see his divine nature. What transformed us when we saw truly?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Widow\'s Offering',
    description: 'She gave two copper coins—all she had. Jesus saw not the amount, but the devotion.',
  },
  {
    season: 'Ordinary Time',
    title: 'Lazarus and Resurrection',
    description: 'Jesus wept. Then he called: "Lazarus, come out!" Before resurrection comes grief.',
  },
  {
    season: 'Thanksgiving',
    title: 'An Attitude of Gratitude',
    description: 'Give thanks in all circumstances. This is not denial—it is deep seeing.',
  },
  {
    season: 'Thanksgiving',
    title: 'The Ten Lepers',
    description: 'Only one returned to say thank you. In gratitude, we recognize grace.',
  },
  {
    season: 'Thanksgiving',
    title: 'Harvest and Humility',
    description: 'We reap what we have sown. In harvest, we acknowledge dependence on something greater than ourselves.',
  },
  {
    season: 'Thanksgiving',
    title: 'Abundance and Trust',
    description: 'The birds don\'t sow or reap. Yet they are fed. What does it mean to trust?',
  },
  {
    season: 'Advent',
    title: 'Watching and Waiting',
    description: 'Advent begins again. Winter returns. We light candles in the darkness and wait.',
  },
];

// Daily scriptures data - comprehensive content for first 13 weeks
const DAILY_SCRIPTURES: Record<string, Array<{ ref: string; text: string; prompt: string }>> = {
  // ADVENT 1
  'Advent-1': [
    { ref: 'Isaiah 40:1-11', text: 'Comfort, comfort my people, says your God. Speak tenderly to Jerusalem, and proclaim to her that her hard service has been completed.', prompt: 'What comfort do you most need right now? Where does your body feel the weight of hard service?' },
    { ref: 'Jeremiah 33:14-16', text: 'The days are coming, declares the Lord, when I will fulfill the good promise I made to the people of Israel and Judah.', prompt: 'What promise are you waiting for God to fulfill? What does fulfillment feel like in your body?' },
    { ref: 'Psalm 25:1-10', text: 'To you, O Lord, I lift up my soul. In you I trust, my God. Do not let me be put to shame, nor let my enemies triumph over me.', prompt: 'When you lift your soul to God, what gesture does your body make? What do you trust with?' },
    { ref: '1 Thessalonians 3:9-13', text: 'We pray this so that the Lord Jesus Christ will strengthen your hearts and make you blameless and holy in the presence of our God and Father when our Lord Jesus comes with all his holy ones.', prompt: 'What would it feel like to have your heart strengthened? Where do you need that strength?' },
    { ref: 'Luke 21:25-36', text: 'There will be signs in the sun, moon and stars. On the earth, nations will be in anguish and perplexity at the roaring and tossing of the sea.', prompt: 'In the turmoil around you, what signs of God\'s presence do you notice? What grounds you?' },
    { ref: 'Isaiah 2:1-5', text: 'In the last days the mountain of the Lord\'s temple will be established as the highest of the mountains. Many peoples will come and say, "Come, let us go up to the mountain of the Lord."', prompt: 'What mountain are you climbing toward? What would it mean to seek God\'s ways?' },
    { ref: 'Psalm 80:1-7', text: 'Hear us, Shepherd of Israel, you who lead Joseph like a flock. Shine forth before Ephraim, Benjamin and Manasseh.', prompt: 'Do you feel shepherded? What would it feel like to be led like a flock? What needs your attention?' },
  ],

  // ADVENT 2
  'Advent-2': [
    { ref: 'Isaiah 40:1-11', text: 'Every valley shall be raised up, every mountain and hill made low; the rough ground shall become level, the rugged places a plain.', prompt: 'What rough places within you long to be made smooth? What valleys need lifting?' },
    { ref: 'Matthew 3:1-12', text: 'John appeared in the wilderness, preaching a baptism of repentance for the forgiveness of sins. The whole Judean countryside and all the people of Jerusalem went out to him.', prompt: 'What wilderness are you in? What needs to be washed clean from you?' },
    { ref: 'Psalm 72:1-7', text: 'Endow the king with your justice, O God. May he defend the afflicted among the people and save the children of the needy.', prompt: 'What justice do you long to see? Who are the vulnerable ones you care for?' },
    { ref: 'Philippians 4:4-9', text: 'Rejoice in the Lord always. I will say it again: Rejoice! Let your gentleness be evident to all. The Lord is near.', prompt: 'What would rejoicing feel like in your body? How might gentleness soften you?' },
    { ref: 'Proverbs 8:1-11', text: 'Does not wisdom call out? Does not understanding raise her voice? On the heights along the way, where the paths meet, she takes her stand.', prompt: 'Where do you hear wisdom calling? What does she say to you?' },
    { ref: 'Isaiah 35:1-10', text: 'The desert and the parched land will be glad; the wilderness will rejoice and blossom. Like the crocus, it will burst into bloom; it will rejoice greatly and shout for joy.', prompt: 'What dry places within you long to bloom? What joy is waiting to emerge?' },
    { ref: 'Luke 1:46-55', text: 'Mary said: "My soul glorifies the Lord and my spirit rejoices in God my Savior, for he has been mindful of the humble state of his servant."', prompt: 'What does it feel like to have God notice you? To be seen and remembered?' },
  ],

  // ADVENT 3
  'Advent-3': [
    { ref: 'Isaiah 61:1-4', text: 'The Spirit of the Sovereign Lord is on me, because the Lord has anointed me to proclaim good news to the poor. He has sent me to bind up the brokenhearted.', prompt: 'Where is your heart broken? What healing does it long for?' },
    { ref: 'John 1:6-8, 19-28', text: 'There was a man sent from God whose name was John. He came as a witness to testify concerning that light, so that through him all might believe.', prompt: 'What light are you witnessing? What needs your testimony?' },
    { ref: 'Psalm 146', text: 'Praise the Lord. Praise the Lord, my soul. I will praise the Lord all my life; I will sing praise to my God as long as I live.', prompt: 'What moves you to praise? What gratitude lives in your body?' },
    { ref: 'Philippians 4:4-7', text: 'Rejoice in the Lord always. Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', prompt: 'What are you carrying anxiously? What would it mean to release it?' },
    { ref: 'Isaiah 12:2-6', text: 'Surely God is my salvation; I will trust and not be afraid. The Lord, the Lord himself, is my strength and my defense; he has become my salvation.', prompt: 'What would it feel like to stop being afraid? Where does strength live in you?' },
    { ref: 'Song of Songs 2:8-13', text: 'Listen! My beloved is coming, leaping across the mountains, bounding over the hills. My beloved is like a gazelle or a young stag.', prompt: 'What or whom do you long for? What does longing feel like?' },
    { ref: 'Luke 1:26-38', text: 'Mary asked the angel, "How will this be, since I am a virgin?" The angel answered, "The Holy Spirit will come on you, and the power of the Most High will overshadow you."', prompt: 'What is God asking you to make space for? What would surrender look like?' },
  ],

  // ADVENT 4
  'Advent-4': [
    { ref: 'Isaiah 7:10-16', text: 'The Lord himself will give you a sign: The virgin will conceive and give birth to a son, and will call him Immanuel. He will be eating curds and honey when he knows enough to reject the wrong and choose the right.', prompt: 'What sign do you need from God? What would it mean that God is with you?' },
    { ref: 'Matthew 1:18-25', text: 'This is how the birth of Jesus the Messiah came about. Mary was pledged to be married to Joseph, but before they came together, she was found to be pregnant through the Holy Spirit.', prompt: 'What unexpected thing is God inviting you into? What would it take to say yes?' },
    { ref: 'Psalm 89:1-4, 19-26', text: 'I will sing of the Lord\'s great love forever; with my mouth I will make your faithfulness known through all generations.', prompt: 'What stories of God\'s love do you carry? What faithfulness have you witnessed?' },
    { ref: 'Romans 1:1-7', text: 'Paul, a servant of Christ Jesus, called to be an apostle and set apart for the gospel of God—the gospel he promised beforehand through his prophets in the Holy Scriptures.', prompt: 'What are you being called toward? What purpose stirs in you?' },
    { ref: 'Micah 5:2-5a', text: 'But you, Bethlehem Ephrathah, though you are small among the clans of Judah, out of you will come for me one who will be ruler over Israel.', prompt: 'What small place in you might God want to work through? What is hidden that might be revealed?' },
    { ref: 'Luke 1:39-45', text: 'When Elizabeth heard Mary\'s greeting, the baby leaped in her womb, and Elizabeth was filled with the Holy Spirit. In a loud voice she exclaimed: "Blessed is she who has believed that the Lord would fulfill his promises to her!"', prompt: 'What leaps within you at the nearness of God? What do you believe God will do?' },
    { ref: 'Isaiah 9:2-7', text: 'The people walking in darkness have seen a great light; on those living in the land of deep darkness a light has dawned. You have enlarged the nation and increased their joy.', prompt: 'What darkness are you walking through? What light beckons to you?' },
  ],

  // CHRISTMAS 1
  'Christmas-1': [
    { ref: 'Isaiah 52:7-10', text: 'How beautiful on the mountains are the feet of those who bring good news, who proclaim peace, who bring good tidings, who proclaim salvation.', prompt: 'What good news do you carry? What would it feel like to proclaim it?' },
    { ref: 'Luke 2:1-14', text: 'She gave birth to her firstborn, a son. She wrapped him in cloths and placed him in a manger, because there was no guest room available for them. And there were shepherds living out in the fields nearby.', prompt: 'What tenderness moves you? What is born in you that needs wrapping, tending?' },
    { ref: 'Psalm 98', text: 'Sing to the Lord a new song, for he has done marvelous things; his right hand and his holy arm have worked salvation for him.', prompt: 'What new song wants to emerge from you? What deliverance have you experienced?' },
    { ref: 'Titus 3:4-7', text: 'But when the kindness and love of God our Savior appeared, he saved us, not because of righteous things we had done, but because of his mercy.', prompt: 'Where have you experienced kindness you didn\'t deserve? What mercy moves through you?' },
    { ref: 'Hebrews 1:1-12', text: 'In the past God spoke to our ancestors through the prophets at many times and in various ways, but in these last days he has spoken to us by his Son.', prompt: 'How is God speaking to you now? What is God saying?' },
    { ref: 'John 1:1-14', text: 'The Word became flesh and made his dwelling among us. We have seen his glory, the glory of the one and only Son, who came from the Father, full of grace and truth.', prompt: 'What does it mean that God became flesh, a body like yours? What truth does that speak?' },
    { ref: 'Luke 2:15-20', text: 'When the angels had left them and gone into heaven, the shepherds said to one another, "Let\'s go to Bethlehem and see this thing that has happened, which the Lord has told us about." Mary treasured all these things in her heart and pondered them.', prompt: 'What wonders are you treasuring? What needs your attention and care?' },
  ],

  // CHRISTMAS 2
  'Christmas-2': [
    { ref: 'Jeremiah 31:7-14', text: 'This is what the Lord says: "Sing with joy for Jacob; shout for the foremost of the nations. Make your praises heard, and say, \'Lord, save your people, the remnant of Israel.\'"', prompt: 'What joy bubbles up in you? What salvation are you celebrating?' },
    { ref: 'Psalm 147:12-20', text: 'Praise the Lord, Jerusalem; praise your God, Zion. He strengthens the bars of your gates and blesses your people within you.', prompt: 'What strengthens you? What blessings are you aware of?' },
    { ref: 'Ephesians 1:3-14', text: 'Praise be to the God and Father of our Lord Jesus Christ, who has blessed us in the heavenly realms with every spiritual blessing in Christ.', prompt: 'What blessings have you received? How does gratitude reshape you?' },
    { ref: 'Luke 2:22-40', text: 'When the time came for the purification rites required by the Law of Moses, Joseph and Mary took him to Jerusalem to present him to the Lord.', prompt: 'What needs to be presented, offered, dedicated? What are you consecrating?' },
    { ref: 'Isaiah 61:10-62:3', text: 'I delight greatly in the Lord; my soul rejoices in my God. For he has clothed me with garments of salvation and arrayed me in a robe of his righteousness.', prompt: 'What are you clothed with? What righteousness or grace covers you?' },
    { ref: 'Galatians 4:4-7', text: 'But when the set time had fully come, God sent his Son, born of a woman, born under the law, to redeem those under the law, that we might receive adoption to sonship.', prompt: 'What does it mean to be fully adopted? Where do you belong?' },
    { ref: 'Matthew 2:1-12', text: 'After Jesus was born in Bethlehem in Judea, during the time of King Herod, Magi from the east came to Jerusalem and asked, "Where is the one who has been born king of the Jews?"', prompt: 'What calls you to seek? What kingship are you recognizing?' },
  ],

  // EPIPHANY 1
  'Epiphany-1': [
    { ref: 'Isaiah 60:1-6', text: 'Arise, shine, for your light has come, and the glory of the Lord rises upon you. See, darkness covers the earth and thick darkness is over the peoples, but the Lord rises upon you and his glory appears over you.', prompt: 'What light are you called to arise into? Where is God\'s glory appearing in your life?' },
    { ref: 'Matthew 2:1-12', text: 'On coming to the house, they saw the child with his mother Mary, and they bowed down and worshiped him. Then they opened their treasures and presented him with gifts—gold, frankincense and myrrh.', prompt: 'What treasures do you bring? What are you offering to the sacred?' },
    { ref: 'Psalm 72:1-7, 10-14', text: 'Endow the king with your justice, O God, the royal son with your righteousness. He will defend the afflicted among the people and save the children of the needy.', prompt: 'What justice do you long to see in the world? Who will you defend?' },
    { ref: 'Ephesians 3:1-12', text: 'For this reason I, Paul, the prisoner of Christ Jesus for the sake of you Gentiles... In reading this, then, you will be able to understand my insight into the mystery of Christ.', prompt: 'What mysteries are being revealed to you? What is becoming clear?' },
    { ref: 'Song of Songs 3:11', text: 'Come out, you daughters of Zion, and look at King Solomon wearing a crown, the crown with which his mother crowned him on the day of his wedding, the day his heart rejoiced.', prompt: 'What celebration moves you? When has your heart fully rejoiced?' },
    { ref: 'Proverbs 3:13-18', text: 'Blessed are those who find wisdom, those who gain understanding, for she is more profitable than silver and yields better returns than gold.', prompt: 'What wisdom do you seek? What understanding would transform you?' },
    { ref: 'John 2:1-11', text: 'Jesus said to the servants, "Fill the jars with water"; so they filled them to the brim. Then he told them, "Now draw some out and take it to the master of the banquet." They did so, and the master of the banquet tasted the water that had been turned into wine.', prompt: 'What need is God transforming for you? What water is becoming wine in your life?' },
  ],

  // EPIPHANY 2
  'Epiphany-2': [
    { ref: 'Malachi 3:1-4', text: '"I will send my messenger, who will prepare the way before me. Then suddenly the Lord you are seeking will come to his temple; the messenger of the covenant, whom you desire, will come," says the Lord Almighty.', prompt: 'What are you seeking? What would it mean to have God suddenly arrive?' },
    { ref: 'Luke 3:15-17, 21-22', text: 'When all the people were being baptized, Jesus was baptized too. And as he was praying, heaven was opened and the Holy Spirit descended on him in bodily form like a dove.', prompt: 'What would it feel like to have heaven open for you? What blessing descends?' },
    { ref: 'Psalm 29', text: 'The voice of the Lord is over the waters; the God of glory thunders, the Lord thunders over the mighty waters. The voice of the Lord is powerful; the voice of the Lord is majestic.', prompt: 'What is God\'s voice saying to you? How do you recognize the sacred speaking?' },
    { ref: 'Acts 8:14-17', text: 'When the apostles in Jerusalem heard that Samaria had accepted the word of God, they sent Peter and John to Samaria. When they arrived, they prayed for the new believers there, that they might receive the Holy Spirit.', prompt: 'What blessing are you praying for in others? What Spirit-filled presence do you seek?' },
    { ref: 'Isaiah 43:1-7', text: '"Fear not, for I have redeemed you; I have summoned you by name; you are mine. When you pass through the waters, I will be with you."', prompt: 'Does God know your name? What waters are you passing through? Where is God with you?' },
    { ref: '1 Corinthians 12:12-13', text: 'Just as a body, though one, has many parts, but all its many parts form one body, so it is with Christ. For we were all baptized by one Spirit so as to form one body.', prompt: 'What body do you belong to? Where is your part essential?' },
    { ref: 'Romans 6:3-11', text: 'Or don\'t you know that all of us who were baptized into Christ Jesus were baptized into his death? We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.', prompt: 'What needs to die in you? What new life longs to emerge?' },
  ],

  // ORDINARY TIME 1
  'Ordinary Time-1': [
    { ref: 'Nehemiah 8:8-12', text: 'They read from the Book of the Law of God, making it clear and giving the meaning so that the people understood what was being read. Then all the people went away to eat and drink, to send portions of food and to celebrate with great joy.', prompt: 'What truth sets you free? What brings you joy and celebration?' },
    { ref: 'Luke 4:14-21', text: '"The Spirit of the Lord is on me, because he has anointed me to proclaim good news to the poor. He has sent me to proclaim freedom for the prisoners and recovery of sight for the blind, to set the oppressed free."', prompt: 'What captivity are you longing to be freed from? What sight do you need to recover?' },
    { ref: 'Psalm 19', text: 'The heavens declare the glory of God; the skies proclaim the work of his hands. The law of the Lord is perfect, refreshing the soul.', prompt: 'Where do you see God\'s glory? How do God\'s ways refresh you?' },
    { ref: '1 Corinthians 12:12-31a', text: 'Just as a body, though one, has many parts, but all its many parts form one body, so it is with Christ... Now you are the body of Christ, and each one of you is a part of it.', prompt: 'What is your unique part in God\'s body? Where do you belong?' },
    { ref: 'Jeremiah 1:4-10', text: 'The word of the Lord came to me, saying, "Before I formed you in the womb I knew you, before you were born I set you apart."', prompt: 'Does God know you that intimately? What are you set apart for?' },
    { ref: 'Genesis 37:3-4, 12-28', text: 'Israel loved Joseph more than any of his other sons, because he had been born to him in his old age; and he made an ornate robe for him. When his brothers saw that their father loved him more than any of them, they hated him.', prompt: 'What love or rejection do you carry from family? What healing might transform this?' },
    { ref: 'Matthew 4:12-23', text: '"Come, follow me," Jesus said, "and I will send you out to fish for people." At once they left their nets and followed him.', prompt: 'What is Jesus calling you to leave behind? What would you follow him into?' },
  ],

  // ORDINARY TIME 2
  'Ordinary Time-2': [
    { ref: 'Proverbs 8:22-31', text: '"The Lord brought me forth as the first of his works, before his deeds of old... I was there when he set the heavens in place, when he marked out the horizon on the face of the deep."', prompt: 'Does it comfort you that you were in God\'s mind before creation? What does that mean?' },
    { ref: 'Luke 8:22-25', text: 'He got into a boat with his disciples. "Let\'s go over to the other side of the lake," he said. As they sailed, he fell asleep. A squall came down on the lake, so that the boat was being swamped. The disciples went and woke him up, shouting, "Master, Master, we\'re going to drown!"', prompt: 'What storms are you in? Where is Jesus in your fear? What would it take to trust?' },
    { ref: 'Psalm 107:1-3, 23-32', text: 'Give thanks to the Lord, for he is good; his love endures forever... Some went out on the sea in ships; they were merchants on the mighty waters. They saw the works of the Lord, his wonderful deeds in the deep.', prompt: 'Where have you seen God working in the depths? What wonder have you witnessed?' },
    { ref: 'Job 38:1-11', text: 'Then the Lord spoke to Job out of the storm. He said: "Who is this that obscures my plans with words without knowledge? Brace yourself like a man; I will question you, and you shall answer me."', prompt: 'What is God asking you to understand about your smallness, your place in the cosmos?' },
    { ref: 'Isaiah 40:21-31', text: 'Do you not know? Have you not heard? The Lord is the everlasting God, the Creator of the ends of the earth. He will not grow tired or weary.', prompt: 'What would it feel like to trust God\'s endurance? Where are you growing weary?' },
    { ref: '1 Kings 19:11-13', text: 'The Lord said, "Go out and stand on the mountain in the presence of the Lord, for the Lord is about to pass by." Then a great and powerful wind tore the mountains apart... After the wind there was an earthquake... After the earthquake came a fire... And after the fire came a gentle whisper.', prompt: 'What gentle whisper are you listening for? Where is God speaking quietly to you?' },
    { ref: 'Matthew 6:25-34', text: '"Therefore I tell you, do not worry about your life, what you will eat or drink; or about your body, what you will wear. Is not life more than food, and the body more than clothes? Look at the birds of the air."', prompt: 'What worry weighs on you? Can you trust God\'s care like the birds do?' },
  ],

  // LENT 1
  'Lent-1': [
    { ref: 'Joel 2:12-17', text: '"Rend your heart and not your garments. Return to the Lord your God, for he is gracious and compassionate, slow to anger and abounding in love, and he relents from sending calamity."', prompt: 'What needs to be torn open in you? What return to God is being invited?' },
    { ref: 'Matthew 6:1-6, 16-21', text: '"When you fast, do not look somber as the hypocrites do, for they disfigure their faces to show others they are fasting... But when you fast, put oil on your head and wash your face, to show your fasting is not to others but to your Father, who is unseen."', prompt: 'What are you fasting from? What is this releasing in you?' },
    { ref: 'Psalm 51:1-17', text: 'Have mercy on me, O God, according to your unfailing love; according to your great compassion blot out my transgressions. Wash away all my iniquity and cleanse me from my sin.', prompt: 'What needs forgiveness in you? What mercies are you asking God for?' },
    { ref: 'Deuteronomy 30:15-20', text: '"See, I set before you today life and good, death and evil... Choose life, that you and your offspring may live."', prompt: 'What choices are you making toward life? What death are you turning from?' },
    { ref: 'Romans 5:1-11', text: 'Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ, through whom we have gained access by faith into this grace in which we now stand.', prompt: 'What peace have you found in reconciliation? What grace are you standing in?' },
    { ref: 'Isaiah 58:1-12', text: '"Is not this the kind of fasting I have chosen: to loose the chains of injustice and untie the cords of the yoke, to set the oppressed free and break every yoke?"', prompt: 'What chains need breaking? How are you called to free others?' },
    { ref: 'Luke 15:1-3, 11-32', text: 'The younger son said to his father, "I am no longer worthy to be called your son." But the father said to his servants, "Quick! Bring the best robe and put it on him."', prompt: 'What unworthiness have you felt? Can you receive the father\'s embrace?' },
  ],

  // LENT 2
  'Lent-2': [
    { ref: 'Genesis 12:1-4a', text: '"The Lord had said to Abram, \'Go from your country, your people and your father\'s household to the land I will show you.\' So Abram went, as the Lord had told him."', prompt: 'What is God calling you to leave? Where are you being sent?' },
    { ref: 'Psalm 121', text: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.', prompt: 'What mountains are you climbing? Where do you find your help?' },
    { ref: 'Romans 4:1-5, 13-17', text: 'Abraham believed God, and it was credited to him as righteousness... His faith was counted as righteousness, a righteousness not his own but received through trust.', prompt: 'What would it mean to believe God in the impossible? Where is your faith weak?' },
    { ref: 'John 3:1-17', text: 'Jesus answered, "Very truly I tell you, no one can see the kingdom of God unless they are born again." "How can someone be born when they are old?" Nicodemus asked.', prompt: 'What needs to be born again in you? Are you willing to be remade?' },
    { ref: 'Jeremiah 26:1-15', text: '"If you do not listen to me and follow my law, which I have set before you, and if you do not listen to the words of my servants the prophets, whom I have sent to you again and again... then I will make this house like Shiloh."', prompt: 'What prophetic words are you resisting? What is God trying to tell you?' },
    { ref: 'Exodus 17:1-7', text: 'The Israelites grumbled against Moses, saying, "Why did you bring us up out of Egypt to let us die of thirst in this desert?"... Moses cried out to the Lord, "What am I to do with these people?"', prompt: 'What are you thirsty for? Where is God providing what you need?' },
    { ref: 'Matthew 17:1-9', text: 'There he was transfigured before them. His face shone like the sun, and his clothes became as white as the light. Just then there appeared before them Moses and Elijah, talking with Jesus.', prompt: 'When have you glimpsed the divine? What transformation are you waiting for?' },
  ],

  // LENT 3
  'Lent-3': [
    { ref: 'Exodus 3:1-15', text: 'Moses said to God, "Suppose I go to the Israelites and say to them, \'The God of your fathers has sent me to you,\' and they ask me, \'What is his name?\' Then what shall I tell them?" God said to Moses, "I AM WHO I AM."', prompt: 'What is your name? What does God call you? How does God see your being?' },
    { ref: 'Psalm 95', text: 'Come, let us bow down in worship, let us kneel before the Lord our Maker... Today, if only you would hear his voice.', prompt: 'What makes you bow down? Where do you hear God\'s voice today?' },
    { ref: 'Romans 5:1-11', text: 'And we boast in the hope of the glory of God. Not only so, but we also glory in our suffering, because we know that suffering produces perseverance; perseverance, character; and character, hope.', prompt: 'What is suffering teaching you? How is character being formed in you?' },
    { ref: 'John 4:5-42', text: '"Everyone who drinks this water will be thirsty again, but whoever drinks the water I give them will never thirst. Indeed, the water I give them will become in them a spring of water welling up to eternal life."', prompt: 'What water do you keep drinking that doesn\'t satisfy? What eternal spring is offered?' },
    { ref: 'Isaiah 43:16-21', text: '"Forget the former things; do not dwell on the past. See, I am doing a new thing! Now it springs up; do you not perceive it?"', prompt: 'What are you clinging to that needs releasing? What new thing is God doing?' },
    { ref: 'Hosea 4:1-3; 5:15-6:6', text: '"Return to the Lord your God, for he has dealt harshly with you because of your sins. Let us acknowledge the Lord; let us press on to acknowledge him."', prompt: 'What return to God is calling to you? What would wholehearted devotion look like?' },
    { ref: 'Luke 13:1-9', text: '"Unless you repent, you too will all perish... A man had a fig tree growing in his vineyard, and he went to look for fruit on it but did not find any. So he said to the man who took care of the vineyard, \'For three years now I\'ve been coming to look for fruit on this fig tree and haven\'t found any. Cut it down.\'"', prompt: 'What fruit is your life bearing? What would it mean to bear good fruit?' },
  ],
};

/**
 * Get daily content for a specific day of week and season
 */
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

/**
 * Seed weekly themes and daily content if database is empty
 */
export async function autoSeedThemesIfEmpty(app: App): Promise<void> {
  try {
    app.logger.info('Checking if weekly themes exist...');

    // Check if any themes exist
    const existing = await app.db
      .select()
      .from(schema.weeklyThemes)
      .limit(1);

    if (existing.length > 0) {
      app.logger.info('Weekly themes already seeded in database');
      return;
    }

    app.logger.info('No weekly themes found. Auto-seeding 52 weeks of themes...');

    const startDate = new Date(getNextMondayPacific());
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

    app.logger.info({ themesCreated: createdThemes.length }, 'Weekly themes created');

    // Create daily content for each theme
    for (let i = 0; i < createdThemes.length; i++) {
      const themeId = createdThemes[i].id;
      const seasonWeek = `${createdThemes[i].liturgicalSeason}-${i + 1}`;

      const dailyContent = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const content = getDailyContent(seasonWeek, dayOfWeek);

        // Day titles for each day of week
        const dayTitles = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        dailyContent.push({
          weeklyThemeId: themeId,
          dayOfWeek,
          dayTitle: dayTitles[dayOfWeek],
          scriptureReference: content.ref,
          scriptureText: content.text,
          reflectionPrompt: content.prompt,
        });
      }

      await app.db.insert(schema.dailyContent).values(dailyContent);
    }

    app.logger.info(
      { themesCreated: createdThemes.length, dailyContentCreated: createdThemes.length * 7 },
      'Auto-seeding complete: 52 weeks of themes with daily content created'
    );
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to auto-seed themes');
    throw error;
  }
}
