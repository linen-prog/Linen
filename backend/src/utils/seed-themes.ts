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

  // HOLY WEEK / EASTER SEASON (Weeks 14-20)
  'Holy Week-1': [
    { ref: 'Psalm 113:1-9', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Blessed be the name of the Lord both now and forevermore.', prompt: 'What praise rises in you as you approach Holy Week?' },
    { ref: 'Zechariah 9:9-10', text: 'Rejoice greatly, Daughter Zion! Shout, Daughter Jerusalem! See, your king comes to you, righteous and victorious.', prompt: 'What does it mean to welcome your king?' },
    { ref: 'Matthew 21:1-11', text: 'Jesus sent two disciples, saying to them, "Go to the village ahead of you, and at once you will find a donkey tied there, with her colt by her."', prompt: 'How do you welcome Jesus into your life this week?' },
    { ref: 'Isaiah 50:4-9a', text: 'The Sovereign Lord has given me a well-instructed tongue, to know the word that sustains the weary.', prompt: 'Where do you need sustenance?' },
    { ref: 'Psalm 31:9-16', text: 'Be merciful to me, Lord, for I am in distress; my eyes grow weak with sorrow, my soul and body with anguish.', prompt: 'What distress are you carrying to the cross?' },
    { ref: 'Philippians 2:5-11', text: 'Let the same mindset be in you as was in Christ Jesus... He humbled himself by becoming obedient to death—even death on a cross!', prompt: 'What does obedience to God look like in your life?' },
    { ref: 'John 13:1-17', text: 'Jesus knew that the Father had put all things under his power, and that he had come from God and was returning to God; so he got up from the meal and began to wash his disciples\' feet.', prompt: 'How can you serve others as Jesus did?' },
  ],

  'Holy Week-2': [
    { ref: 'Isaiah 52:13-53:12', text: 'But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him.', prompt: 'What does Christ\'s suffering mean for you?' },
    { ref: 'Hebrews 10:16-25', text: 'Therefore, brothers and sisters, since we have confidence to enter the Most Holy Place by the blood of Jesus... let us hold unswervingly to the hope we profess.', prompt: 'Where is your hope anchored?' },
    { ref: 'John 18:1-19:42', text: 'Jesus said, "It is finished." With that, he bowed his head and gave up his spirit.', prompt: 'What is being finished in you through Christ\'s death?' },
    { ref: 'Psalm 22:1-31', text: 'My God, my God, why have you forsaken me? Why are you so far from saving me, so far from my cries of anguish?', prompt: 'Where have you felt abandoned? Where is God present?' },
    { ref: 'Lamentations 3:22-33', text: 'Because of the Lord\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.', prompt: 'What new mercy do you need this day?' },
    { ref: '1 Peter 1:3-9', text: 'Praise be to the God and Father of our Lord Jesus Christ! In his great mercy he has given us new birth into a living hope through the resurrection of Jesus Christ from the dead.', prompt: 'What hope does resurrection bring?' },
    { ref: 'Psalm 31:1-4', text: 'In you, Lord, I have taken refuge; let me never be put to shame; deliver me in your righteousness.', prompt: 'Where do you find refuge?' },
  ],

  // EASTER (Weeks 21-24)
  'Easter-1': [
    { ref: 'Romans 6:3-11', text: 'We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.', prompt: 'What new life is rising in you?' },
    { ref: 'Psalm 118:14-24', text: 'The Lord is my strength and my defense; he has become my salvation. Shouts of joy and victory resound in the tents of the righteous.', prompt: 'What victory are you celebrating?' },
    { ref: '1 Corinthians 15:1-11', text: 'For what I received I passed on to you as of first importance: that Christ died for our sins according to the Scriptures... and that he appeared to Cephas, and then to the Twelve.', prompt: 'What does resurrection mean to you?' },
    { ref: 'John 20:19-31', text: 'Jesus came and stood among them and said, "Peace be with you!" Again Jesus said, "Peace be with you! As the Father has sent me, I am sending you."', prompt: 'What peace does the risen Christ offer?' },
    { ref: 'Psalm 23:1-6', text: 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.', prompt: 'What rest do you need?' },
    { ref: 'Colossians 3:1-4', text: 'Since, then, you have been raised with Christ, set your hearts on things above, where Christ is, seated at the right hand of God.', prompt: 'Where are your affections focused?' },
    { ref: 'Luke 24:36-48', text: '"Why are you troubled, and why do doubts rise in your minds? Look at my hands and my feet. It is I myself! Touch me and see; a ghost does not have a body, as you see I have."', prompt: 'What does it mean that Christ rose bodily?' },
  ],

  'Easter-2': [
    { ref: 'John 10:11-18', text: 'I am the good shepherd. The good shepherd lays down his life for the sheep. I know my sheep and my sheep know me.', prompt: 'Do you know Christ as your shepherd?' },
    { ref: 'Psalm 42:1-11', text: 'As the deer pants for streams of water, so my soul pants for you, my God. My soul thirsts for God, for the living God.', prompt: 'What is your soul thirsting for?' },
    { ref: '1 John 3:1-7', text: 'How great is the love the Father has lavished on us, that we should be called children of God! And that is what we are!', prompt: 'Do you feel loved as God\'s child?' },
    { ref: 'Revelation 1:4-8', text: '"I am the Alpha and the Omega," says the Lord God, "who is, and who was, and who is to come, the Almighty."', prompt: 'What does it mean that Christ is everything?' },
    { ref: 'Psalm 148:1-14', text: 'Praise the Lord. Praise the Lord from the heavens; praise him in the heights above. Praise him, all his angels; praise him, all his heavenly host.', prompt: 'How do you join creation in praising God?' },
    { ref: '1 Peter 2:4-10', text: 'As you come to him, the living Stone—rejected by humans but chosen by God and precious to him—you also, like living stones, are being built into a spiritual house.', prompt: 'Are you being built up in God\'s house?' },
    { ref: 'Psalm 139:7-18', text: 'Where can I go from your Spirit? Where can I flee from your presence? If I go up to the heavens, you are there; if I make my bed in the depths, you are there.', prompt: 'Where do you experience God\'s presence?' },
  ],

  'Easter-3': [
    { ref: 'Acts 4:32-35', text: 'All the believers were one in heart and mind. No one claimed that any of their possessions was their own, but they shared everything they had.', prompt: 'How does resurrection transform community?' },
    { ref: 'Psalm 23:4-6', text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.', prompt: 'What comfort do you need?' },
    { ref: 'John 21:1-19', text: 'When they landed, they saw a fire of burning coals there with fish on it, and some bread. Jesus said to them, "Come and have breakfast."', prompt: 'How does Christ nourish you?' },
    { ref: '1 John 1:1-4', text: 'That which was from the beginning, which we have heard, which we have seen with our eyes, which we have looked at and our hands have touched—this we proclaim concerning the Word of life.', prompt: 'What have you encountered of God?' },
    { ref: 'Psalm 148:1-14', text: 'Praise the Lord from the earth, you great sea creatures and all ocean depths, lightning and hail, snow and clouds, stormy winds that do his bidding.', prompt: 'How does all creation praise God?' },
    { ref: '2 Corinthians 5:17', text: 'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!', prompt: 'What is being made new in you?' },
    { ref: 'John 3:31-36', text: 'The one who comes from above is above all; the one who is from the earth belongs to the earth, and speaks as one from the earth. The one who comes from heaven is above all.', prompt: 'Where are you looking?' },
  ],

  'Easter-4': [
    { ref: 'Psalm 146:5-10', text: 'Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God... The Lord sets prisoners free.', prompt: 'What freedom are you discovering?' },
    { ref: 'Acts 17:22-31', text: 'From one man he made all the nations, that they should inhabit the whole earth; and he marked out their appointed times in history and the boundaries of their lands.', prompt: 'How does God guide history?' },
    { ref: 'John 17:20-26', text: '"My prayer is not for them alone. I pray also for those who will believe in me through their message, that all of them may be one, Father, just as you are in me and I am in you."', prompt: 'What is Christ praying for you?' },
    { ref: 'Psalm 8:1-9', text: 'O Lord, our Lord, how majestic is your name in all the earth! You have set your glory in the heavens. When I consider your heavens, the work of your fingers, the moon and the stars, which you have set in place, what is mankind that you are mindful of them?', prompt: 'Do you feel God\'s care despite your smallness?' },
    { ref: '1 John 4:7-21', text: 'Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God.', prompt: 'How does love reveal God?' },
    { ref: 'Proverbs 8:22-31', text: '"The Lord brought me forth as the first of his works, before his deeds of old... I was there when he set the heavens in place."', prompt: 'Was Wisdom present at creation?' },
    { ref: 'Psalm 97:1-12', text: 'The Lord reigns, let the earth be glad; let the distant shores rejoice. Clouds and thick darkness surround him; righteousness and justice are the foundation of his throne.', prompt: 'Is God\'s kingdom just?' },
  ],

  // ASCENSION & PENTECOST (Weeks 25-26)
  'Ascension-1': [
    { ref: 'Acts 1:6-14', text: '"Lord, are you at this time going to restore the kingdom to Israel?" He said to them: "It is not for you to know the times or dates the Father has set by his own authority. But you will receive power when the Holy Spirit comes on you."', prompt: 'What power are you awaiting?' },
    { ref: 'Psalm 68:1-10', text: 'May God arise, may his enemies be scattered; may his foes flee before him... Sing to God, sing in praise of his name, extol him who rides on the clouds.', prompt: 'How do you see God rising?' },
    { ref: 'Ephesians 1:15-23', text: 'I pray that the eyes of your heart may be enlightened in order that you may know the hope to which he has called you, the riches of his glorious inheritance in his holy people.', prompt: 'What is your inheritance in Christ?' },
    { ref: 'Luke 24:44-53', text: 'He told them, "This is what is written: The Messiah will suffer and rise from the dead on the third day, and repentance for the forgiveness of sins will be preached in his name to all nations."', prompt: 'How do you live out forgiveness?' },
    { ref: 'Psalm 47:1-9', text: 'Clap your hands, all you nations; shout to God with cries of joy. For the Lord Most High is awesome, the great King over all the earth.', prompt: 'What causes you to rejoice?' },
    { ref: 'Hebrews 9:24-28', text: 'For Christ did not enter a sanctuary made with human hands that was only a copy of the true one; he entered heaven itself, now to appear for us in God\'s presence.', prompt: 'What does it mean Christ intercedes for you?' },
    { ref: 'John 17:1-11', text: '"Father, the hour has come. Glorify your Son, that your Son may glorify you... Now they know that everything you have given me comes from you."', prompt: 'What glory is Jesus seeking?' },
  ],

  'Pentecost-1': [
    { ref: 'Acts 2:1-21', text: 'When the day of Pentecost came, all the believers were together in one place. Suddenly a sound like the blowing of a violent wind came from heaven and filled the whole house where they were sitting.', prompt: 'Where is the Spirit moving in your life?' },
    { ref: 'Psalm 104:24-34', text: 'When you hide your face, they are terrified; when you take away their breath, they die and return to the dust. When you send your Spirit, they are created, and you renew the face of the ground.', prompt: 'How does the Spirit renew you?' },
    { ref: '1 Corinthians 12:12-13', text: 'Just as a body, though one, has many parts... For we were all baptized by one Spirit so as to form one body.', prompt: 'Where is your place in the Body?' },
    { ref: 'John 15:26-27', text: '"When the Advocate comes, whom I will send to you from the Father—the Spirit of truth who goes out from the Father—he will testify about me."', prompt: 'How does the Spirit testify to Christ in you?' },
    { ref: 'Psalm 33:12-22', text: 'Blessed is the nation whose God is the Lord, the people he chose for his inheritance. From heaven the Lord looks down and sees all mankind.', prompt: 'Do you trust God\'s perspective?' },
    { ref: 'Romans 8:1-11', text: 'Therefore, there is now no condemnation for those who are in Christ Jesus, because through Christ Jesus the law of the Spirit who gives life has set you free from the law of sin and death.', prompt: 'What freedom has the Spirit given?' },
    { ref: 'Galatians 5:16-26', text: 'So I say, walk by the Spirit, and you will not gratify the desires of the flesh. For the flesh desires what is contrary to the Spirit, and the Spirit what is contrary to the flesh.', prompt: 'Which desires rule your life?' },
  ],

  // ORDINARY TIME (Weeks 27-50)
  'Ordinary Time-14': [
    { ref: 'Matthew 5:1-12', text: '"Blessed are the poor in spirit, for theirs is the kingdom of heaven. Blessed are those who mourn, for they will be comforted."', prompt: 'Which beatitude speaks to your heart?' },
    { ref: 'Psalm 37:1-11', text: 'Do not fret because of those who are evil or be envious of those who do wrong; for like the grass they will soon wither, like green plants they will soon die away.', prompt: 'What worry can you release?' },
    { ref: 'Philippians 3:7-14', text: 'But whatever were gains to me I now consider loss for the sake of Christ. What is more, I consider everything a loss because of the surpassing worth of knowing Christ Jesus my Lord.', prompt: 'What are you gaining in Christ?' },
    { ref: 'Psalm 19:7-14', text: 'The precepts of the Lord are right, giving joy to the heart. The commands of the Lord are radiant, giving light to the eyes.', prompt: 'How do God\'s words give light?' },
    { ref: 'Matthew 13:1-23', text: 'Then he told them many things in parables, saying: "A farmer went out to sow his seed. As he was scattering the seed, some fell along the path..."', prompt: 'What kind of soil is your heart?' },
    { ref: 'Psalm 65:9-13', text: 'You care for the land and water it; you enrich it abundantly. The streams of God are filled with water to provide the people with grain.', prompt: 'How does God provide?' },
    { ref: '1 Timothy 6:6-19', text: '"For the love of money is a root of all kinds of evil. Some people, eager for money, have wandered from the faith and pierced themselves with many griefs."', prompt: 'What role does money play in your spirituality?' },
  ],

  'Ordinary Time-15': [
    { ref: 'Matthew 14:22-33', text: 'But Jesus immediately said to them: "Take courage! It is I. Don\'t be afraid." "Lord, if it\'s you," Peter replied, "tell me to come to you on the water." "Come," he said.', prompt: 'Where is Jesus calling you forward?' },
    { ref: 'Psalm 85:8-13', text: 'I will listen to what God the Lord says; he promises peace to his people, his faithful servants—but let them not turn to folly.', prompt: 'Do you listen for peace?' },
    { ref: 'Proverbs 9:1-12', text: 'Wisdom has built her house; she has set up its seven pillars. She has prepared her meat and mixed her wine; she has also set her table.', prompt: 'Are you feasting on wisdom?' },
    { ref: 'Psalm 51:1-12', text: 'Create in me a pure heart, O God, and renew a steadfast spirit within me. Do not cast me from your presence or take your Holy Spirit from me.', prompt: 'What needs to be renewed in you?' },
    { ref: 'Matthew 15:10-20', text: '"What comes out of your mouth is what defiles you. For out of the overflow of the heart the mouth speaks."', prompt: 'What does your speech reveal?' },
    { ref: 'Psalm 62:5-12', text: 'Yes, my soul, find rest in God; my hope comes from him. Truly he is my rock and my salvation; he is my fortress, I will not be shaken.', prompt: 'Where do you find rest?' },
    { ref: '2 Corinthians 11:24-12:10', text: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Therefore I will boast all the more gladly about my weaknesses.', prompt: 'How is God\'s grace sufficient?' },
  ],

  'Ordinary Time-16': [
    { ref: 'Matthew 16:21-28', text: '"Whoever wants to be my disciple must deny themselves and take up their cross and follow me. For whoever wants to save their life will lose it, but whoever loses their life for me will find it."', prompt: 'What cross are you called to carry?' },
    { ref: 'Psalm 138:1-8', text: 'I give you thanks, O Lord, with my whole heart; before the gods I sing your praise; I bow down toward your holy temple and give thanks to your name for your steadfast love and your faithfulness.', prompt: 'What are you thankful for?' },
    { ref: 'Isaiah 56:1-8', text: '"Maintain justice and do what is right, for my salvation is close at hand and my righteousness will soon be revealed."', prompt: 'How does justice matter in your faith?' },
    { ref: 'Psalm 119:129-136', text: 'Your statutes are wonderful; therefore I obey them. The unfolding of your words gives light; it gives understanding to the simple.', prompt: 'How do God\'s words unfold?' },
    { ref: 'Matthew 18:15-20', text: '"If your brother or sister sins, go and point out their fault, just between the two of you. If they listen to you, you have won them over."', prompt: 'How do you address conflict?' },
    { ref: 'Psalm 17:1-9', text: 'Hear me, righteous God, as I cry out; listen to my prayer. It springs not from deceitful lips. Let my vindication come from you; let your eyes see what is right.', prompt: 'What justice do you need?' },
    { ref: 'Matthew 18:21-35', text: '"Lord, how many times shall I forgive my brother or sister who sins against me? Up to seven times?" Jesus answered, "I tell you, not seven times, but seventy-seven times."', prompt: 'How do you practice endless forgiveness?' },
  ],

  'Ordinary Time-17': [
    { ref: 'Matthew 21:28-32', text: '"Which of the two did what his father wanted?" The son who said yes but did not go. Jesus said to them, "Truly I tell you, the tax collectors and the prostitutes are entering the kingdom of God ahead of you."', prompt: 'What does obedience mean to you?' },
    { ref: 'Psalm 25:1-9', text: 'In you, Lord, I have taken refuge; let me never be put to shame; deliver me in your righteousness. Turn your ear to me, come quickly to my rescue.', prompt: 'What refuge do you need?' },
    { ref: 'Philippians 1:21-30', text: '"For to me, to live is Christ and to die is gain. But if I am to go on living in the body, this will mean fruitful labor for me."', prompt: 'What does a Christ-centered life mean to you?' },
    { ref: 'Psalm 95:1-11', text: 'Come, let us sing for joy to the Lord; let us shout aloud to the Rock of our salvation. Let us come before him with thanksgiving and extol him with music and song.', prompt: 'How do you worship?' },
    { ref: 'Matthew 22:1-14', text: 'Jesus spoke to them again in parables, saying: "The kingdom of heaven is like a king who prepared a wedding banquet for his son."', prompt: 'Are you invited to the feast?' },
    { ref: 'Psalm 33:12-22', text: 'From heaven the Lord looks down and sees all mankind; from his dwelling place he watches all who live on earth.', prompt: 'Does God\'s gaze comfort or challenge you?' },
    { ref: 'Matthew 22:15-22', text: '"Show me the coin used for paying the tax." They brought him a denarius, and he asked them, "Whose image is this? And whose inscription?" "Caesar\'s," they replied. Then he said to them, "So give back to Caesar what is Caesar\'s, and to God what is God\'s."', prompt: 'What belongs to God?' },
  ],

  'Ordinary Time-18': [
    { ref: 'Matthew 23:1-12', text: '"The greatest among you will be your servant. For those who exalt themselves will be humbled, and those who humble themselves will be exalted."', prompt: 'How do you practice humility?' },
    { ref: 'Psalm 113:1-9', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Blessed be the name of the Lord both now and forevermore.', prompt: 'What deserves your praise?' },
    { ref: 'Amos 5:18-24', text: '"But let justice roll on like a river, righteousness like a never-failing stream!"', prompt: 'How are you pursuing justice?' },
    { ref: 'Psalm 70:1-5', text: 'Hasten, O God, to save me; come quickly, Lord, to help me. May those who want to take my life be put to shame and confusion.', prompt: 'What help do you need?' },
    { ref: '1 Thessalonians 4:13-18', text: '"For the Lord himself will come down from heaven, with a loud command, with the voice of the archangel and with the trumpet call of God."', prompt: 'What does Christ\'s return mean to you?' },
    { ref: 'Psalm 90:1-12', text: 'A prayer of Moses the man of God. Lord, you have been our dwelling place throughout all generations. Before the mountains were born or you brought forth the whole world, from everlasting to everlasting you are God.', prompt: 'What is eternal in your life?' },
    { ref: 'Matthew 25:1-13', text: '"Keep watch, because you do not know on what day your Lord will come... Therefore keep watch, because you do not know on what day your Lord will come."', prompt: 'Are you prepared for Christ\'s return?' },
  ],

  'Ordinary Time-19': [
    { ref: 'Matthew 25:31-46', text: '"Come, you who are blessed by my Father; take your inheritance, the kingdom prepared for you since the creation of the world. For I was hungry and you gave me something to eat, I was a stranger and you invited me in."', prompt: 'How do you see Christ in others?' },
    { ref: 'Psalm 146:5-10', text: 'Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God... The Lord sets prisoners free.', prompt: 'What freedom does God offer?' },
    { ref: 'Zephaniah 1:7-2:3', text: '"Be silent before the Sovereign Lord, for the day of the Lord is near."', prompt: 'How do you prepare for God\'s judgment?' },
    { ref: 'Psalm 123:1-4', text: 'I lift up my eyes to you, to you who sit enthroned in heaven. As the eyes of slaves look to the hand of their master, as the eyes of a female slave look to the hand of her mistress, so our eyes look to the Lord our God.', prompt: 'Do you look to God for guidance?' },
    { ref: '1 Kings 3:5-12', text: '"Ask for whatever you want me to give you." Solomon answered, "Now, Lord my God, you have made your servant king in place of my father David. But I am only a little child and do not know how to carry out my duties."', prompt: 'What wisdom do you need?' },
    { ref: 'Psalm 19:1-6', text: 'The heavens declare the glory of God; the skies proclaim the work of his hands. Day after day they pour forth speech; night after night they reveal knowledge.', prompt: 'What does creation tell you about God?' },
    { ref: 'Matthew 6:25-34', text: '"Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own."', prompt: 'What worries can you release?' },
  ],

  'Ordinary Time-20': [
    { ref: 'James 1:17-27', text: '"Do not merely listen to the word, and so deceive yourselves. Do what it says. Anyone who listens to the word but does not do what it says is like someone who looks at his face in a mirror."', prompt: 'How do you put faith into action?' },
    { ref: 'Psalm 1:1-6', text: 'Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take or sit in the company of mockers, but whose delight is in the law of the Lord.', prompt: 'Where is your delight?' },
    { ref: 'Proverbs 22:1-16', text: '"A good name is more desirable than great riches; to be esteemed is better than silver or gold."', prompt: 'What builds your character?' },
    { ref: 'Psalm 139:1-18', text: 'You have searched me, Lord, and you know me. You know when I sit and when I rise; you perceive my thoughts from afar.', prompt: 'How does God\'s intimate knowledge comfort you?' },
    { ref: 'Mark 7:1-23', text: '"For it is from within, out of a person\'s heart, that evil thoughts come—sexual immorality, theft, murder, adultery, greed, malice, deceit, lewdness, envy, slander, arrogance and folly."', prompt: 'What needs cleansing in your heart?' },
    { ref: 'Psalm 15:1-5', text: 'Lord, who may dwell in your sacred tent? Who may live on your holy mountain? The one whose walk is blameless, who does what is righteous.', prompt: 'What righteousness are you pursuing?' },
    { ref: '3 John 1-14', text: '"I have no greater joy than to hear that my children are walking in the truth."', prompt: 'How are you walking in truth?' },
  ],

  'Ordinary Time-21': [
    { ref: 'Luke 4:16-30', text: '"He unrolled the scroll and found the place where it is written: The Spirit of the Lord is upon me, because he has anointed me to bring good news to the poor."', prompt: 'How does the Spirit anoint you?' },
    { ref: 'Psalm 81:3-11', text: '"I am the Lord your God, who brought you up out of Egypt. Open wide your mouth and I will fill it... But my people would not listen to me."', prompt: 'Are you listening to God?' },
    { ref: 'Proverbs 3:1-12', text: '"My son, do not forget my teaching, but keep my commands in your heart, for they will prolong your life many years and bring you peace."', prompt: 'What teachings guide you?' },
    { ref: 'Psalm 107:1-9', text: 'Give thanks to the Lord, for he is good; his love endures forever. Let the redeemed of the Lord tell their story—those he redeemed from the hand of the foe.', prompt: 'What is your redemption story?' },
    { ref: 'Hebrews 12:1-3', text: '"Therefore, since we are surrounded by a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us."', prompt: 'What race are you running?' },
    { ref: 'Psalm 37:23-40', text: 'The Lord establishes the steps of the one who delights in him; though he may stumble, he will not fall, for the Lord upholds him with his hand.', prompt: 'How is God establishing your steps?' },
    { ref: 'Matthew 10:24-39', text: '"Anyone who loves their father or mother more than me is not worthy of me; anyone who loves their son or daughter more than me is not worthy of me."', prompt: 'Where does your loyalty lie?' },
  ],

  'Ordinary Time-22': [
    { ref: 'Proverbs 1:20-33', text: '"How long will you who are simple love your simple ways? How long will mockers delight in mockery and fools hate knowledge?"', prompt: 'Are you seeking wisdom?' },
    { ref: 'Psalm 29:1-11', text: 'Ascribe to the Lord, O mighty ones, ascribe to the Lord glory and strength. Ascribe to the Lord the glory due to his name.', prompt: 'What glory do you give to God?' },
    { ref: 'Isaiah 35:4-7a', text: '"Say to those with fearful hearts, \'Be strong, do not fear; your God will come... to save you.\' Then will the eyes of the blind be opened and the ears of the deaf unstopped."', prompt: 'What blindness needs healing?' },
    { ref: 'Psalm 116:1-9', text: 'I love the Lord, for he heard my voice; he heard my cry for mercy. Because he turned his ear to me, I will call on him as long as I live.', prompt: 'Does God hear your prayer?' },
    { ref: 'James 2:1-10,14-17', text: '"Faith without deeds is dead... Show me your faith without deeds, and I will show you my faith by my deeds."', prompt: 'How are your deeds showing your faith?' },
    { ref: 'Psalm 146:1-10', text: 'Praise the Lord, my soul. I will praise the Lord all my life; I will sing praise to my God as long as I live.', prompt: 'What moves you to praise?' },
    { ref: 'Mark 8:22-26', text: 'Some people brought a blind man and begged Jesus to touch him. He took the blind man by the hand and led him outside the village. When he had spit on the man\'s eyes and put his hands on him, Jesus asked, "Do you see anything?"', prompt: 'How is Jesus healing your sight?' },
  ],

  'Ordinary Time-23': [
    { ref: 'Proverbs 29:1-14', text: '"A man who hardens his neck after much reproof will suddenly be broken beyond healing... When the righteous thrive, the people rejoice; when the wicked rule, the people groan."', prompt: 'How do you respond to correction?' },
    { ref: 'Psalm 52:1-9', text: 'Why do you boast of evil, you mighty man? Why do you boast all day long, you who are a disgrace in the eyes of God?', prompt: 'What pride needs humbling?' },
    { ref: 'Deuteronomy 4:1-2,6-8', text: '"Now, Israel, hear the decrees and laws I am about to teach you. Follow them so that you may live and may go in and take possession of the land that the Lord, the God of your ancestors, is giving you."', prompt: 'How do you live out God\'s laws?' },
    { ref: 'Psalm 15:1-5', text: 'Lord, who may dwell in your sacred tent? Who may live on your holy mountain? The one whose walk is blameless, who does what is righteous.', prompt: 'What holiness are you pursuing?' },
    { ref: 'Philemon 1-25', text: '"I appeal to you for my son Onesimus, who became my son while I was imprisoned for the gospel. Formerly he was useless to you, but now he has become useful both to you and to me."', prompt: 'How do you welcome the changed?' },
    { ref: 'Psalm 84:1-12', text: 'How lovely is your dwelling place, Lord Almighty! My soul yearns, even faints, for the courts of the Lord; my heart and my flesh cry out for the living God.', prompt: 'What are you longing for in God?' },
    { ref: 'Luke 15:1-32', text: '"But the father said to his servants, \'Quick! Bring the best robe and put it on him. Put a ring on his finger and sandals on his feet. Bring the fattened calf and kill it. Let\'s have a feast and celebrate.\'"', prompt: 'How does God celebrate your return?' },
  ],

  'Ordinary Time-24': [
    { ref: 'Exodus 32:1-14', text: 'When the people saw that Moses was so long in coming down from the mountain, they gathered around Aaron and said, "Come, make us gods who will go before us."', prompt: 'What false gods are you chasing?' },
    { ref: 'Psalm 106:19-23', text: 'At Horeb they made a calf and worshiped an idol cast from metal... But Moses sought the favor of the Lord his God.', prompt: 'Who do you worship?' },
    { ref: 'Isaiah 50:4-9', text: 'The Sovereign Lord has given me a well-instructed tongue, to know the word that sustains the weary. He wakens me morning by morning, wakens my ear to listen like one being instructed.', prompt: 'How does God sustain you?' },
    { ref: 'Psalm 51:1-12', text: 'Have mercy on me, O God, according to your unfailing love; according to your great compassion blot out my transgressions.', prompt: 'What mercy do you need?' },
    { ref: '1 Timothy 1:12-17', text: '"The grace of our Lord was poured out on me abundantly, along with the faith and love that are in Christ Jesus... Christ Jesus came into the world to save sinners."', prompt: 'How has grace transformed you?' },
    { ref: 'Psalm 25:1-10', text: 'To you, Lord, I lift up my soul; in you I trust, my God. Do not let me be put to shame, nor let my enemies triumph over me.', prompt: 'What trust do you need?' },
    { ref: 'Matthew 20:1-16', text: '"The kingdom of heaven is like a landowner who went out early in the morning to hire workers for his vineyard... When they received it, they began to grumble against the landowner."', prompt: 'How do you respond to God\'s generosity?' },
  ],

  'Ordinary Time-25': [
    { ref: 'Jonah 3:10-4:11', text: '"I knew that you are a gracious and compassionate God, slow to anger and abounding in love, a God who relents from sending calamity... You have concern for the vine, but should I not have concern for the great city of Nineveh?"', prompt: 'What shows God\'s compassion?' },
    { ref: 'Psalm 145:1-8', text: 'I will exalt you, my God the King; I will praise your name for ever and ever. Every day I will praise you and extol your name for ever and ever.', prompt: 'How do you praise God daily?' },
    { ref: 'Philippians 1:21-30', text: '"I am torn between the two: I desire to depart and be with Christ, which is better by far; but it is more necessary for you that I remain in the body."', prompt: 'Where does your purpose lie?' },
    { ref: 'Psalm 33:1-12', text: 'Sing joyfully to the Lord, you righteous; it is fitting for the upright to praise him. Praise the Lord with the harp; make music to him on the ten-stringed lyre.', prompt: 'How do you sing to the Lord?' },
    { ref: 'Matthew 21:28-32', text: '"Which of the two did what his father wanted?" "The first," they answered. Jesus said to them, "Truly I tell you, the tax collectors and the prostitutes are entering the kingdom of God ahead of you."', prompt: 'How do you obey the Father?' },
    { ref: 'Psalm 99:1-9', text: 'The Lord reigns, let the nations tremble; he is enthroned between the cherubim, let the earth shake. Great is the Lord in Zion; he is exalted over all the nations.', prompt: 'What exaltation does God deserve?' },
    { ref: 'Habakkuk 1:1-4,2:1-4', text: '"How long, Lord, must I call for help, but you do not listen? Or cry out to you, \"Violence!\" but you do not save?"', prompt: 'How do you cope with unanswered prayers?' },
  ],

  'Ordinary Time-26': [
    { ref: 'Deuteronomy 5:4-6,16-21', text: '"The Lord spoke to you face to face on the mountain from out of the fire... Your Father and your mother, so that you may live long in the land the Lord your God is giving you."', prompt: 'How do you honor your family?' },
    { ref: 'Psalm 113:1-9', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Blessed be the name of the Lord both now and forevermore.', prompt: 'What deserves praise?' },
    { ref: 'Matthew 15:1-20', text: '"It is not what enters the mouth that defiles a person, but what comes out of the mouth; this defiles a person."', prompt: 'What comes from your mouth?' },
    { ref: 'Psalm 19:7-14', text: 'The precepts of the Lord are right, giving joy to the heart. The commands of the Lord are radiant, giving light to the eyes.', prompt: 'How do God\'s commands give light?' },
    { ref: 'Romans 13:8-14', text: '"The commandments... are summed up in this one rule: \'Love your neighbor as yourself.\' Love does no harm to a neighbor. Therefore love is the fulfillment of the law."', prompt: 'How do you love your neighbor?' },
    { ref: 'Psalm 146:5-10', text: 'Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God... The Lord sets prisoners free.', prompt: 'What freedom do you seek?' },
    { ref: 'Isaiah 35:1-7', text: 'The desert and the parched land will be glad; the wilderness will rejoice and blossom. Like the crocus, it will burst into bloom; it will rejoice greatly and shout for joy.', prompt: 'What is blooming in your wilderness?' },
  ],

  'Ordinary Time-27': [
    { ref: 'Ecclesiastes 1:2-11', text: '"Meaningless! Meaningless!" says the Teacher. "Utterly meaningless! Everything is meaningless... What has been will be again, what has been done will be done again; there is nothing new under the sun."', prompt: 'Where do you find meaning?' },
    { ref: 'Psalm 90:12-17', text: 'Teach us to number our days, that we may gain a heart of wisdom... May the favor of the Lord our God rest on us; establish the work of our hands for us.', prompt: 'How are you using your days wisely?' },
    { ref: 'Amos 6:1-7', text: '"Woe to you who are complacent in Zion... You lie on beds adorned with ivory and lounge on your couches... But you do not grieve over the ruin of Joseph."', prompt: 'Are you complacent about injustice?' },
    { ref: 'Psalm 146:1-10', text: 'Praise the Lord, my soul. I will praise the Lord all my life; I will sing praise to my God as long as I live.', prompt: 'What lifts your soul in praise?' },
    { ref: '1 Timothy 6:6-19', text: '"For the love of money is a root of all kinds of evil... But you, man of God, flee from all this, and pursue righteousness, godliness, faith, love, endurance and gentleness."', prompt: 'What are you pursuing?' },
    { ref: 'Psalm 119:1-8', text: 'Blessed are those whose ways are blameless, who walk according to the law of the Lord. Blessed are those who keep his statutes and seek him with all their heart.', prompt: 'How wholehearted is your seeking?' },
    { ref: 'Luke 16:19-31', text: '"There was a rich man who was dressed in purple and fine linen and lived in luxury every day. At his gate was laid a beggar named Lazarus... The rich man also died and was buried."', prompt: 'How do you respond to poverty?' },
  ],

  'Ordinary Time-28': [
    { ref: 'Habakkuk 2:1-4', text: 'I will stand at my watch and station myself on the ramparts; I will look to see what he will say to me, and what answer I should give to this complaint. Then the Lord replied: "Write down the revelation and make it plain on tablets so that a herald may run with it."', prompt: 'What is God revealing to you?' },
    { ref: 'Psalm 119:137-144', text: 'You are righteous, Lord, and your laws are right... Your statutes are forever right; give me understanding that I may live.', prompt: 'How do you understand God\'s righteousness?' },
    { ref: '2 Timothy 1:1-14', text: '"For the Spirit God gave us does not make us timid, but gives us power, love and a sound mind... Guard the good deposit that was entrusted to you—guard it with the help of the Holy Spirit who lives in us."', prompt: 'What power has the Spirit given you?' },
    { ref: 'Psalm 43:3-4', text: 'Send me your light and your faithful care, let them lead me; let them bring me to your holy mountain, to the place where you live. Then I will go to the altar of God, to God, my joy and my delight.', prompt: 'Where is your joy in God?' },
    { ref: 'Luke 17:1-10', text: '"If your brother or sister sins against you, rebuke them; and if they repent, forgive them. Even if they sin against you seven times in a day and seven times come back to you saying \'I repent,\' you must forgive them."', prompt: 'How do you practice forgiveness?' },
    { ref: 'Psalm 37:1-7', text: 'Do not fret because of those who are evil or be envious of those who do wrong; for like the grass they will soon wither, like green plants they will soon die away. Trust in the Lord and do good.', prompt: 'What worry can you release to God?' },
    { ref: 'Ezekiel 18:1-4,25-32', text: '"Do I take any pleasure in the death of the wicked? Rather, am I not pleased when they turn from their ways and live?"', prompt: 'How does God want you to turn?' },
  ],

  'Ordinary Time-29': [
    { ref: 'Isaiah 1:10-20', text: '"Wash and make yourselves clean. Take your evil deeds out of my sight; stop doing wrong. Learn to do right; seek justice."', prompt: 'How are you making yourself clean?' },
    { ref: 'Psalm 50:1-23', text: '"I do not rebuke you for your sacrifices or your burnt offerings, which are ever before me. I have no need of a bull from your stall or of goats from your pens."', prompt: 'What does God really want from you?' },
    { ref: 'Hebrews 12:4-13', text: '"Endure hardship as discipline; God is treating you as his children. For what children are not disciplined by their father?"', prompt: 'How do you accept God\'s discipline?' },
    { ref: 'Psalm 119:165-176', text: 'Great peace have those who love your law, and nothing can make them stumble. I wait for your salvation, Lord, and I follow your commands.', prompt: 'What peace does obedience bring?' },
    { ref: 'Luke 18:9-14', text: '"The Pharisee stood by himself and prayed about himself: \'God, I thank you that I am not like other people.\' But the tax collector stood at a distance... and would not even look up to heaven."', prompt: 'How do you approach God with humility?' },
    { ref: 'Psalm 121:1-8', text: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.', prompt: 'Where is your help coming from?' },
    { ref: 'Joel 2:23-32', text: '"Be glad, people of Zion, rejoice in the Lord your God, for he has given you the autumn rains because he is faithful."', prompt: 'How has God been faithful to you?' },
  ],

  'Ordinary Time-30': [
    { ref: 'Amos 7:7-15', text: 'This is what he showed me: The Lord was standing by a wall that had been built true to plumb, with a plumb line in his hand. And the Lord asked me, "Amos, what do you see?" "A plumb line," I replied.', prompt: 'Where is God measuring your life?' },
    { ref: 'Psalm 26:1-8', text: 'Vindicate me, Lord, for I have walked in my integrity. I have trusted in the Lord and have not wavered.', prompt: 'How are you walking with integrity?' },
    { ref: '2 Timothy 4:6-8,16-18', text: '"I have fought the good fight, I have finished the race, I have kept the faith. Now there is in store for me the crown of righteousness, which the Lord, the righteous Judge, will award to me on that day."', prompt: 'What race are you fighting?' },
    { ref: 'Psalm 119:25-32', text: 'My soul clings to the dust; preserve my life according to your word... Lead me in your truth and teach me.', prompt: 'How are you clinging to God\'s word?' },
    { ref: 'Luke 18:15-30', text: '"Let the little children come to me, and do not hinder them, for the kingdom of God belongs to such as these... Truly I tell you, anyone who will not receive the kingdom of God like a little child will never enter it."', prompt: 'What childlikeness does faith require?' },
    { ref: 'Psalm 82:1-8', text: 'God presides in the great assembly; he renders judgment among the gods: "How long will you defend the unjust and show partiality to the wicked?"', prompt: 'Where do you see injustice?' },
    { ref: 'Micah 7:18-20', text: 'Who is a God like you, who pardons sin and forgives the transgression of the remnant of his inheritance? You do not stay angry forever but delight to show mercy.', prompt: 'How does God\'s mercy comfort you?' },
  ],

  'Ordinary Time-31': [
    { ref: 'Habakkuk 1:2-3,2:2-4', text: 'How long, Lord, must I call for help, but you do not listen? Or cry out to you, "Violence!" but you do not save? Why do you tolerate the wicked?', prompt: 'How do you wait for God\'s justice?' },
    { ref: 'Psalm 121:1-8', text: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth. He will not let your foot slip—he who watches over you will not slumber.', prompt: 'What protection does God offer?' },
    { ref: '2 Thessalonians 1:1-12', text: '"We ought always to thank God for you, brothers and sisters, and rightly so, because your faith is growing more and more, and the love all of you have for one another is increasing."', prompt: 'What grows in your faith?' },
    { ref: 'Psalm 65:1-13', text: 'Praise awaits you, our God, in Zion; to you our vows will be fulfilled. You who answer prayer, to you all people will come.', prompt: 'What answers to prayer have you witnessed?' },
    { ref: 'Luke 19:1-10', text: '"Zacchaeus, come down immediately. I must stay at your house today." So he came down at once and welcomed him gladly... Jesus said to him, "Today salvation has come to this house."', prompt: 'Where has salvation come into your life?' },
    { ref: 'Psalm 34:1-8', text: 'I will extol the Lord at all times; his praise will always be on my lips. I will glory in the Lord; let the afflicted hear and rejoice.', prompt: 'How are you glorifying the Lord?' },
    { ref: 'Deuteronomy 10:12-22', text: '"And now, Israel, what does the Lord your God ask of you but to fear the Lord your God, to walk in obedience to him, to love him, to serve the Lord your God with all your heart and with all your soul."', prompt: 'What does obedience require of you?' },
  ],

  'Ordinary Time-32': [
    { ref: 'Zephaniah 3:14-20', text: '"Sing, Daughter Zion; shout aloud, Israel! Be glad and rejoice with all your heart, Daughter Jerusalem!"', prompt: 'What causes you to sing?' },
    { ref: 'Psalm 9:1-10', text: 'I will give thanks to you, Lord, with all my heart; I will tell of all your wonderful deeds. I will be glad and rejoice in you; I will sing the praises of your name, O Most High.', prompt: 'What wonderful deeds has God done?' },
    { ref: '1 Thessalonians 5:1-11', text: '"Let us be alert and self-controlled... For God did not appoint us to suffer wrath but to receive salvation through our Lord Jesus Christ."', prompt: 'How are you alert to God\'s presence?' },
    { ref: 'Psalm 123:1-4', text: 'I lift up my eyes to you, to you who sit enthroned in heaven. As the eyes of slaves look to the hand of their master, as the eyes of a female slave look to the hand of her mistress, so our eyes look to the Lord our God.', prompt: 'Where are your eyes focused?' },
    { ref: 'Matthew 25:14-30', text: '"To one he gave five bags of gold, to another two bags, and to another one bag, each according to his ability. Then he went on his journey."', prompt: 'How are you using your talents?' },
    { ref: 'Psalm 100:1-5', text: 'Shout for joy to the Lord, all the earth. Worship the Lord with gladness; come before him with joyful songs.', prompt: 'How do you worship with joy?' },
    { ref: 'Isaiah 43:16-21', text: '"Forget the former things; do not dwell on the past. See, I am doing a new thing! Now it springs up; do you not perceive it?"', prompt: 'What new thing is God doing?' },
  ],

  'Ordinary Time-33': [
    { ref: 'Malachi 3:13-4:2a', text: '"You have said harsh things against me," says the Lord. "Yet you ask, \'What have we said against you?\' You have said, \'It is futile to serve God.\'"', prompt: 'Do you doubt the value of faith?' },
    { ref: 'Psalm 98:5-9', text: 'Make music to the Lord with the harp, with the harp and the sound of singing, with trumpets and the blast of the ram\'s horn.', prompt: 'How do you make music for God?' },
    { ref: '2 Thessalonians 3:7-12', text: '"For even when we were with you, we gave you this rule: \'The one who is unwilling to work shall not eat.\'"', prompt: 'How do you work with purpose?' },
    { ref: 'Psalm 16:5-11', text: 'Lord, you alone are my portion and my cup; you make my lot secure. The boundary lines have fallen for me in pleasant places; surely I have a delightful inheritance.', prompt: 'What inheritance do you have in God?' },
    { ref: 'Luke 21:5-19', text: '"They will seize you and persecute you... But not a hair of your head will perish. Stand firm, and you will win life."', prompt: 'How does faith sustain you?' },
    { ref: 'Psalm 84:1-12', text: 'How lovely is your dwelling place, Lord Almighty! My soul yearns, even faints, for the courts of the Lord; my heart and my flesh cry out for the living God.', prompt: 'What dwelling do you long for?' },
    { ref: 'Daniel 12:5-13', text: '"Go your way, Daniel, for these words are concealed and sealed up until the time of the end... But you, go your way to the end."', prompt: 'How do you walk faithfully toward the end?' },
  ],

  // THANKSGIVING & ADVENT PREPARATION (Weeks 34-52)
  'Thanksgiving-1': [
    { ref: 'Philippians 4:4-9', text: 'Rejoice in the Lord always. I will say it again: Rejoice! Let your gentleness be evident to all. The Lord is near.', prompt: 'What causes you to rejoice?' },
    { ref: 'Psalm 100:1-5', text: 'Shout for joy to the Lord, all the earth. Worship the Lord with gladness; come before him with joyful songs. Know that the Lord is God. It is he who made us, and we are his.', prompt: 'How are you joyfully worshiping?' },
    { ref: 'Colossians 3:12-17', text: 'Therefore, as God\'s chosen people, holy and dearly loved, clothe yourselves with compassion, kindness, humility, gentleness and patience. And let the peace of Christ rule in your hearts, to which as members of one body you were called.', prompt: 'What clothing of Christ are you wearing?' },
    { ref: 'Psalm 113:1-9', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Blessed be the name of the Lord both now and forevermore.', prompt: 'What blessing do you see?' },
    { ref: '1 Thessalonians 5:16-18', text: '"Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus."', prompt: 'What are you grateful for?' },
    { ref: 'Psalm 30:1-12', text: 'I will exalt you, Lord, for you lifted me out of the depths and did not let my enemies gloat over me.', prompt: 'How has God lifted you?' },
    { ref: 'Luke 17:11-19', text: '"Were not all ten cleansed? Where are the other nine? Has no one returned to give praise to God except this foreigner?"', prompt: 'How often do you return thanks?' },
  ],

  'Thanksgiving-2': [
    { ref: 'Deuteronomy 8:1-10', text: '"Remember the Lord your God, for it is he who gives you the ability to produce wealth... Be careful that you do not forget the Lord your God."', prompt: 'What abundance has God given?' },
    { ref: 'Psalm 65:9-13', text: 'You care for the land and water it; you enrich it abundantly. The streams of God are filled with water to provide the people with grain, for so you have ordained it.', prompt: 'What provision are you grateful for?' },
    { ref: '2 Corinthians 9:6-15', text: '"Whoever sows generously will reap generously... God loves a cheerful giver."', prompt: 'How do you give cheerfully?' },
    { ref: 'Psalm 107:1-9', text: 'Give thanks to the Lord, for he is good; his love endures forever. Let the redeemed of the Lord tell their story—those he redeemed from the hand of the foe.', prompt: 'What is your redemption story?' },
    { ref: 'Leviticus 23:4-8', text: '"These are the Lord\'s appointed festivals... On the first day hold a sacred assembly and do no regular work."', prompt: 'How do you honor sacred time?' },
    { ref: 'Psalm 126:1-6', text: 'When the Lord restored the fortunes of Zion, we were like those who dreamed. Our mouths were filled with laughter, our tongues with songs of joy.', prompt: 'What joy fills you?' },
    { ref: 'Psalm 117:1-2', text: 'Praise the Lord, all you nations; extol him, all you peoples. For great is his love toward us, and the faithfulness of the Lord endures forever.', prompt: 'How has God\'s love been shown?' },
  ],

  'Thanksgiving-3': [
    { ref: 'Proverbs 17:17,22', text: '"A friend loves at all times... A cheerful heart is good medicine, but a crushed spirit dries up the bones."', prompt: 'Who are you grateful for?' },
    { ref: 'Psalm 150:1-6', text: 'Praise the Lord. Praise God in his sanctuary; praise him in his mighty heavens. Praise him for his acts of power; praise him for his surpassing greatness.', prompt: 'What greatness deserves praise?' },
    { ref: '1 Timothy 4:4-5', text: '"For everything God created is good, and nothing is to be rejected if it is received with thanksgiving, because it is consecrated by the word of God and prayer."', prompt: 'How do you bless your daily food?' },
    { ref: 'Psalm 95:1-7', text: 'Come, let us sing for joy to the Lord; let us shout aloud to the Rock of our salvation. Let us come before him with thanksgiving and extol him with music and song.', prompt: 'How do you sing thanksgiving?' },
    { ref: 'Genesis 1:27-31', text: '"So God created mankind in his own image, in the image of God he created them; male and female he created them... God saw all that he had made, and it was very good."', prompt: 'How do you see yourself in God\'s image?' },
    { ref: 'Psalm 146:1-10', text: 'Praise the Lord, my soul. I will praise the Lord all my life; I will sing praise to my God as long as I live.', prompt: 'What lifts your soul?' },
    { ref: 'Colossians 1:3-12', text: '"We always thank God, the Father of our Lord Jesus Christ, when we pray for you... And we pray this in order that you may live a life worthy of the Lord and may please him in every way."', prompt: 'How do you live worthily?' },
  ],

  'Thanksgiving-4': [
    { ref: 'Nehemiah 8:10', text: '"The joy of the Lord is your strength... Do not grieve, for the joy of the Lord is your strength."', prompt: 'Where is your strength coming from?' },
    { ref: 'Psalm 84:10-12', text: 'Better is one day in your courts than a thousand elsewhere; I would rather be a doorkeeper in the house of my God than dwell in the tents of the wicked.', prompt: 'What is better to you than wealth?' },
    { ref: 'Revelation 7:9-17', text: 'After this I looked, and there before me was a great multitude that no one could count, from every nation, tribe, people and language, standing before the throne and before the Lamb.', prompt: 'What multitude of saints are you part of?' },
    { ref: 'Psalm 92:1-8', text: 'It is good to praise the Lord and make music to your name, O Most High, proclaiming your love in the morning and your faithfulness at night.', prompt: 'How do you praise morning and night?' },
    { ref: 'Proverbs 31:10-31', text: '"A wife of noble character who can find? She is worth far more than rubies... She is clothed with strength and dignity; she can laugh at the days to come."', prompt: 'What strength do you possess?' },
    { ref: 'Psalm 23:1-6', text: 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.', prompt: 'What rest do you need?' },
    { ref: 'Psalm 139:14-18', text: 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well... How precious to me are your thoughts, God! How vast is the sum of them!', prompt: 'How do you value yourself?' },
  ],

  // ADVENT SEASON (Weeks 45-52)
  'Advent-5': [
    { ref: 'Isaiah 2:1-5', text: 'In the last days the mountain of the Lord\'s temple will be established as the highest of the mountains; it will be exalted above the hills, and all nations will stream to it.', prompt: 'What are you waiting for?' },
    { ref: 'Psalm 122:1-9', text: 'I rejoiced with those who said to me, "Let us go to the house of the Lord." Our feet are standing in your gates, Jerusalem.', prompt: 'Where are you being called?' },
    { ref: 'Romans 13:11-14', text: '"The night is nearly over; the day is almost here... Rather, clothe yourselves with the Lord Jesus Christ, and do not think about how to gratify the desires of the flesh."', prompt: 'What are you waiting for?' },
    { ref: 'Psalm 80:1-7', text: 'Hear us, Shepherd of Israel, you who lead Joseph like a flock. Shine forth before Ephraim, Benjamin and Manasseh. Awaken your might; come and save us.', prompt: 'What shepherding do you need?' },
    { ref: 'Mark 13:33-37', text: '"Be on guard! Be alert! You do not know when that time will come... Therefore keep watch... And what I say to you, I say to everyone: \'Watch!\'"', prompt: 'How are you watching and waiting?' },
    { ref: 'Psalm 25:1-10', text: 'In you, Lord, I have taken refuge; let me never be put to shame; deliver me in your righteousness. Turn your ear to me, come quickly to my rescue.', prompt: 'What trust are you asking for?' },
    { ref: 'Philippians 4:4-7', text: '"Rejoice in the Lord always. I will say it again: Rejoice! Let your gentleness be evident to all... Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."', prompt: 'What are you asking God for?' },
  ],

  'Advent-6': [
    { ref: 'Luke 1:26-38', text: '"Greetings, you who are highly favored! The Lord is with you... Mary asked the angel, \'How will this be, since I am a virgin?\' The angel answered, \'The Holy Spirit will come upon you.\'\'', prompt: 'What is God asking you to surrender?' },
    { ref: 'Psalm 98:1-9', text: 'Sing to the Lord a new song, for he has done marvelous things; his right hand and his holy arm have worked salvation for him.', prompt: 'What new song do you sing?' },
    { ref: 'Matthew 1:18-25', text: '"Joseph, son of David, do not be afraid to take Mary home as your wife, because what is conceived in her is from the Holy Spirit."', prompt: 'What fear is God asking you to release?' },
    { ref: 'Psalm 89:1-4,19-26', text: 'I will sing of the Lord\'s great love forever; with my mouth I will make your faithfulness known through all generations.', prompt: 'What faithfulness will you testify to?' },
    { ref: 'Proverbs 9:1-6', text: '"Wisdom has built her house; she has hewn out its seven pillars... Come, eat my food and drink the wine I have mixed. Leave your simple ways and you will live."', prompt: 'Are you receiving wisdom\'s invitation?' },
    { ref: 'Psalm 146:5-10', text: 'Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God... The Lord sets prisoners free.', prompt: 'What freedom does advent promise?' },
    { ref: 'Isaiah 7:10-16', text: '"The Lord himself will give you a sign: The virgin will conceive and give birth to a son, and will call him Immanuel."', prompt: 'What signs do you see of God\'s presence?' },
  ],

  'Advent-7': [
    { ref: 'John 1:1-14', text: '"In the beginning was the Word, and the Word was with God, and the Word was God... The Word became flesh and made his dwelling among us."', prompt: 'What does incarnation mean for you?' },
    { ref: 'Psalm 97:1-12', text: 'The Lord reigns, let the earth be glad; let the distant shores rejoice... Light shines on the righteous and joy on the upright in heart.', prompt: 'What light is dawning in you?' },
    { ref: 'Titus 2:11-14', text: '"For the grace of God has appeared that offers salvation to all people... It teaches us to say \"No\" to ungodliness and worldly passions, and to live self-controlled, upright and godly lives in this present age."', prompt: 'How is grace appearing in your life?' },
    { ref: 'Psalm 72:1-7,18-19', text: 'Endow the king with your justice, O God, the royal son with your righteousness. He will defend the afflicted among the people and save the children of the needy.', prompt: 'What justice are you waiting for?' },
    { ref: 'Hebrews 1:1-12', text: '"In the past God spoke to our ancestors through the prophets at many times and in various ways, but in these last days he has spoken to us by his Son."', prompt: 'How is God speaking to you?' },
    { ref: 'Psalm 45:1-9', text: 'My heart is stirred by a noble theme as I recite my verses for the king; my tongue is the pen of a skillful writer.', prompt: 'What stirs your heart?' },
    { ref: 'Luke 2:1-14', text: '"She gave birth to her firstborn, a son. She wrapped him in cloths and placed him in a manger, because there was no guest room available for them."', prompt: 'Where will you make room for Christ?' },
  ],

  'Advent-8': [
    { ref: 'Psalm 113:1-9', text: 'Praise the Lord. Praise the Lord, you his servants, praise the name of the Lord. Blessed be the name of the Lord both now and forevermore.', prompt: 'What blessing awaits?' },
    { ref: 'Malachi 3:1-4', text: '"I will send my messenger, who will prepare the way before me. Then suddenly the Lord you are seeking will come to his temple."', prompt: 'How are you preparing for Christ?' },
    { ref: 'Luke 1:46-55', text: '"My soul glorifies the Lord and my spirit rejoices in God my Savior, for he has been mindful of the humble state of his servant."', prompt: 'How has God noticed you?' },
    { ref: 'Psalm 33:20-22', text: 'We wait in hope for the Lord; he is our help and our shield. In him our hearts rejoice, for we trust in his holy name.', prompt: 'What hope do you carry?' },
    { ref: 'Baruch 5:1-9', text: '"Take off your robe of mourning and affliction, and put on the beauty of glory from God forever... God will lead Israel with joy in the light of his glory."', prompt: 'What beauty will you put on?' },
    { ref: 'Psalm 126:1-6', text: 'When the Lord restored the fortunes of Zion, we were like those who dreamed. Our mouths were filled with laughter, our tongues with songs of joy.', prompt: 'What joy restores you?' },
    { ref: 'Philippians 4:8-9', text: '"Finally, brothers and sisters, whatever is true, whatever is noble, whatever is right, whatever is pure, whatever is lovely, whatever is admirable—if anything is excellent or praiseworthy—think about such things."', prompt: 'What are you thinking about?' },
  ],

  'Advent-9': [
    { ref: 'Psalm 25:1-10', text: 'To you, Lord, I lift up my soul; in you I trust, my God. Do not let me be put to shame, nor let my enemies triumph over me.', prompt: 'What shame are you releasing?' },
    { ref: 'Isaiah 35:1-10', text: '"The desert and the parched land will be glad; the wilderness will rejoice and blossom... They will enter Zion with singing; everlasting joy will crown their heads."', prompt: 'What blooming are you witnessing?' },
    { ref: 'James 5:7-11', text: '"Be patient, then, brothers and sisters, until the Lord\'s coming... See how the farmer waits for the land to yield its valuable crop, being patient for the autumn and spring rains."', prompt: 'What are you patiently waiting for?' },
    { ref: 'Psalm 21:1-7', text: 'The king rejoices in your strength, Lord. How great is his joy in the victories you give!', prompt: 'What victory are you celebrating?' },
    { ref: 'Luke 21:25-36', text: '"There will be signs in the sun, moon and stars... people will faint from terror... But when these things begin to take place, stand up and lift up your heads, because your redemption is drawing near."', prompt: 'Are you standing firm?' },
    { ref: 'Psalm 72:8-14', text: '"He will rule from sea to sea and from the River to the ends of the earth... All kings will bow down to him and all nations will serve him."', prompt: 'What kingdom are you awaiting?' },
    { ref: 'Jude 1:20-25', text: '"But you, dear friends, by building yourselves up in your most holy faith and praying in the Holy Spirit, keep yourselves in God\'s love as you wait for the mercy of our Lord Jesus Christ to bring you to eternal life."', prompt: 'How are you building yourself up in faith?' },
  ],

  'Advent-10': [
    { ref: 'Isaiah 64:1-9', text: '"Oh, that you would rend the heavens and come down... But when you hide your face, we are dismayed."', prompt: 'How are you longing for God?' },
    { ref: 'Psalm 80:1-7,17-19', text: 'Hear us, Shepherd of Israel, you who lead Joseph like a flock... Restore us, O God; make your face shine on us, that we may be saved.', prompt: 'What restoration do you seek?' },
    { ref: '1 Corinthians 1:3-9', text: '"Grace and peace to you from God our Father and the Lord Jesus Christ... He will also keep you firm to the end, so that you will be blameless on the day of our Lord Jesus Christ."', prompt: 'What strength does grace provide?' },
    { ref: 'Psalm 85:1-13', text: 'You showed favor to your land, Lord; you restored the fortunes of Jacob... Surely his salvation is near those who fear him.', prompt: 'What favor are you waiting for?' },
    { ref: 'Mark 13:24-37', text: '"At that time people will see the Son of Man coming in clouds with great power and glory... What I say to you, I say to everyone: \'Watch!\'"', prompt: 'How are you watching?' },
    { ref: 'Psalm 16:5-11', text: 'Lord, you alone are my portion and my cup; you make my lot secure... You have made known to me the path of life; you will fill me with joy in your presence.', prompt: 'What joy awaits in God\'s presence?' },
    { ref: 'Revelation 22:12-20', text: '"Behold, I am coming soon!... The Spirit and the bride say, \"Come!\" And let the one who hears say, \"Come!\" ... He who testifies to these things says, \"Yes, I am coming soon.\" Amen. Come, Lord Jesus."', prompt: 'What does Christ\'s coming mean to you?' },
  ],
};

/**
 * Get daily content for a specific day of week and season/week
 * Uses predefined scripture data for weeks 1-13, generates content for weeks 14-52
 */
function getDailyContent(seasonWeek: string, dayOfWeek: number, weekIndex: number, themeData: any) {
  // Try to find predefined scripture data for this season-week combination
  const key = Object.keys(DAILY_SCRIPTURES).find((k) => k === seasonWeek);

  if (key && DAILY_SCRIPTURES[key]?.[dayOfWeek]) {
    return DAILY_SCRIPTURES[key][dayOfWeek];
  }

  // For weeks with predefined data, also try the season name alone (fallback)
  const seasonName = seasonWeek.split('-')[0];
  const seasonKey = Object.keys(DAILY_SCRIPTURES).find((k) => k.startsWith(seasonName + '-'));

  if (seasonKey && DAILY_SCRIPTURES[seasonKey]?.[dayOfWeek]) {
    return DAILY_SCRIPTURES[seasonKey][dayOfWeek];
  }

  // For weeks 14-52 without predefined data, generate thematic content
  // based on the theme title and description
  const dayTitles = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayTitles[dayOfWeek];

  // Generate a scripture reference and prompt based on the theme
  const scriptureReferences = [
    'Psalm 139:1-14',     // Day 0: Knowing and being known
    'Proverbs 27:12',     // Day 1: Wisdom and discernment
    'Psalm 34:1-8',       // Day 2: Worship and trust
    'John 15:1-8',        // Day 3: Abiding and fruitfulness
    'Romans 12:1-2',      // Day 4: Transformation
    'Philippians 4:8-9',  // Day 5: Rejoicing and peace
    'Colossians 3:15-17', // Day 6: Peace and gratitude
  ];

  const scripturePrompts = [
    `As you begin the week, reflect on: ${themeData.themeTitle}. What does this theme stir in you?`,
    `What is one way you can embody this week's theme: "${themeData.themeTitle}"?`,
    `In the middle of your week, pause with: ${themeData.themeTitle}. What are you noticing?`,
    `How is God speaking to you about: ${themeData.themeTitle}?`,
    `What practice or insight from this week's theme feels most alive in you?`,
    `As the week concludes, what will you carry forward from: ${themeData.themeTitle}?`,
    `Reflect on the week's theme: ${themeData.themeTitle}. What is God inviting you into next week?`,
  ];

  return {
    ref: scriptureReferences[dayOfWeek],
    text: themeData.themeDescription,
    prompt: scripturePrompts[dayOfWeek],
  };
}

/**
 * Sample somatic exercises for seeding
 */
const SOMATIC_EXERCISES = [
  // Week 1 - Ordinary Time
  {
    title: 'Grounding in the Everyday',
    description: 'Notice the sacred in ordinary moments',
    category: 'grounding' as const,
    duration: '5 min',
    instructions: 'Step 1: Stand or sit with feet flat on the ground.\nStep 2: Notice the sensation of your feet touching the floor.\nStep 3: Breathe slowly and name three ordinary things you\'re grateful for.\nStep 4: Feel yourself held and supported by the earth.',
  },
  // Week 2
  {
    title: 'Breath of Becoming',
    description: 'Trust the slow work of grace',
    category: 'breath' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit comfortably and place one hand on your heart.\nStep 2: Breathe in slowly, imagining yourself as a seed in soil.\nStep 3: Breathe out, releasing the need to rush your growth.\nStep 4: Repeat, trusting the slow work of becoming.',
  },
  // Week 3
  {
    title: 'Turning Inward',
    description: 'Face what you\'ve avoided with compassion',
    category: 'awareness' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit quietly and close your eyes.\nStep 2: Notice any discomfort or tension in your body.\nStep 3: Breathe into that place without trying to fix it.\nStep 4: Say to yourself: "I see you. You are welcome here."',
  },
  // Week 4
  {
    title: 'Desert Stillness',
    description: 'Strip away distractions and meet yourself',
    category: 'release' as const,
    duration: '12 min',
    instructions: 'Step 1: Find a quiet space and sit in silence.\nStep 2: Notice what arises when there are no distractions.\nStep 3: Breathe with whatever emotions or thoughts emerge.\nStep 4: Release the need to fill the silence.',
  },
  // Week 5 - Lent Begins
  {
    title: 'Releasing What Must Die',
    description: 'Let go of habits, fears, and false selves',
    category: 'release' as const,
    duration: '8 min',
    instructions: 'Step 1: Make tight fists with both hands and hold for 10 seconds.\nStep 2: Release your hands and notice the sensation of letting go.\nStep 3: Breathe deeply and ask: "What must die in me?"\nStep 4: With each exhale, imagine releasing what no longer serves.',
  },
  // Week 6
  {
    title: 'Fasting from Control',
    description: 'Clear space and wait',
    category: 'awareness' as const,
    duration: '6 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Notice the urge to control or fix things.\nStep 3: Breathe and release the grip of control.\nStep 4: Ask yourself: "What am I trying to control that I can release?"',
  },
  // Week 7
  {
    title: 'Walking Toward the Cross',
    description: 'Practice surrender with each step',
    category: 'movement' as const,
    duration: '10 min',
    instructions: 'Step 1: Walk slowly, either indoors or outdoors.\nStep 2: With each step, say: "I surrender."\nStep 3: Notice what arises in your body as you walk.\nStep 4: Trust that you are being led.',
  },
  // Week 8
  {
    title: 'Feeling the Weight',
    description: 'Acknowledge the burden of the cross',
    category: 'awareness' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit or stand and imagine holding a heavy weight.\nStep 2: Notice where you feel heaviness in your body.\nStep 3: Breathe into that heaviness without trying to lift it.\nStep 4: Ask: "What weight am I carrying that isn\'t mine?"',
  },
  // Week 9
  {
    title: 'Washing Feet',
    description: 'Practice humility and service',
    category: 'self-compassion' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit comfortably and place your hands on your feet.\nStep 2: Imagine washing your own feet with care.\nStep 3: Speak kindly to yourself: "You are worthy of care."\nStep 4: Breathe slowly, receiving your own compassion.',
  },
  // Week 10 - Holy Week
  {
    title: 'Tomb Stillness',
    description: 'Rest in the darkness and wait',
    category: 'grounding' as const,
    duration: '15 min',
    instructions: 'Step 1: Lie down in a quiet, dark space.\nStep 2: Close your eyes and breathe slowly.\nStep 3: Rest in the stillness without trying to fix or change anything.\nStep 4: Trust that resurrection is coming.',
  },
  // Week 11 - Easter
  {
    title: 'Resurrection Breath',
    description: 'Breathe in new life',
    category: 'breath' as const,
    duration: '5 min',
    instructions: 'Step 1: Stand with your arms at your sides.\nStep 2: Breathe in deeply, raising your arms overhead.\nStep 3: Breathe out, lowering your arms and releasing death.\nStep 4: Repeat, celebrating the new life within you.',
  },
  // Week 12
  {
    title: 'Recognizing the Gardener',
    description: 'Notice where Christ appears',
    category: 'awareness' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit quietly and close your eyes.\nStep 2: Recall a moment when you didn\'t recognize grace.\nStep 3: Breathe and ask: "Where is Christ appearing that I\'m missing?"\nStep 4: Open your eyes and look for the sacred in the ordinary.',
  },
  // Week 13
  {
    title: 'Touching the Wounds',
    description: 'Find peace in your scars',
    category: 'self-compassion' as const,
    duration: '10 min',
    instructions: 'Step 1: Place your hands on a part of your body that holds pain.\nStep 2: Breathe into that place with compassion.\nStep 3: Say to yourself: "Peace be with you."\nStep 4: Notice how your wounds have been transformed.',
  },
  // Week 14
  {
    title: 'Casting Nets',
    description: 'Trust in abundance',
    category: 'movement' as const,
    duration: '6 min',
    instructions: 'Step 1: Stand and extend your arms wide.\nStep 2: Imagine casting a net into the water.\nStep 3: Breathe and trust that provision is coming.\nStep 4: Pull your arms back, receiving abundance.',
  },
  // Week 15 - Ascension
  {
    title: 'Released and Sent',
    description: 'Feel the Spirit equipping you',
    category: 'breath' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Breathe in, imagining the Spirit filling you.\nStep 3: Breathe out, imagining yourself being sent.\nStep 4: Repeat, trusting that you are equipped.',
  },
  // Week 16 - Pentecost
  {
    title: 'Wind and Fire',
    description: 'Receive the Spirit\'s breath',
    category: 'breath' as const,
    duration: '8 min',
    instructions: 'Step 1: Stand with your arms at your sides.\nStep 2: Breathe in deeply, imagining wind filling you.\nStep 3: Breathe out, imagining fire igniting within you.\nStep 4: Repeat, feeling the Spirit\'s power.',
  },
  // Week 17 - Ordinary Time
  {
    title: 'Forgiving Breath',
    description: 'Practice the hard work of release',
    category: 'release' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit comfortably and place one hand on your heart.\nStep 2: Breathe in, naming someone you need to forgive.\nStep 3: Breathe out, releasing resentment and pain.\nStep 4: Repeat, trusting that forgiveness is a process.',
  },
  // Week 18
  {
    title: 'Loving Your Enemies',
    description: 'Embody radical love',
    category: 'self-compassion' as const,
    duration: '12 min',
    instructions: 'Step 1: Sit quietly and bring to mind someone who has harmed you.\nStep 2: Place both hands on your heart.\nStep 3: Breathe and say: "May they be at peace."\nStep 4: Notice what arises in your body as you practice this.',
  },
  // Week 19
  {
    title: 'Running to Embrace',
    description: 'Experience unreserved welcome',
    category: 'movement' as const,
    duration: '5 min',
    instructions: 'Step 1: Stand and imagine someone running toward you.\nStep 2: Open your arms wide to receive their embrace.\nStep 3: Breathe and feel the joy of being welcomed.\nStep 4: Ask: "Where do I experience this kind of love?"',
  },
  // Week 20
  {
    title: 'Welcoming the Stranger',
    description: 'Practice hospitality in your body',
    category: 'awareness' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Imagine welcoming someone unfamiliar.\nStep 3: Notice any resistance or fear in your body.\nStep 4: Breathe and release the need to protect yourself.',
  },
  // Week 21
  {
    title: 'Stopping to Help',
    description: 'Feel the cost of compassion',
    category: 'awareness' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit quietly and recall a time you stopped to help.\nStep 2: Notice what it cost you—time, energy, comfort.\nStep 3: Breathe into that cost without resentment.\nStep 4: Ask: "What does it cost to truly help another?"',
  },
  // Week 22
  {
    title: 'Sitting at Jesus\'s Feet',
    description: 'Practice presence over productivity',
    category: 'grounding' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit on the floor or in a low chair.\nStep 2: Imagine sitting at Jesus\'s feet, listening.\nStep 3: Breathe slowly and release the need to do.\nStep 4: Simply be present.',
  },
  // Week 23
  {
    title: 'Blessed Are',
    description: 'Embody the Beatitudes',
    category: 'self-compassion' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit comfortably and place both hands on your heart.\nStep 2: Breathe in, saying: "Blessed am I."\nStep 3: Breathe out, releasing shame or unworthiness.\nStep 4: Repeat, trusting that you are blessed.',
  },
  // Week 24
  {
    title: 'Salt and Light',
    description: 'Feel your purpose in your body',
    category: 'awareness' as const,
    duration: '6 min',
    instructions: 'Step 1: Stand with your arms at your sides.\nStep 2: Breathe in, imagining yourself as salt—preserving, flavoring.\nStep 3: Breathe out, imagining yourself as light—illuminating, guiding.\nStep 4: Repeat, feeling your purpose.',
  },
  // Week 25
  {
    title: 'Building on Rock',
    description: 'Ground yourself in what holds',
    category: 'grounding' as const,
    duration: '10 min',
    instructions: 'Step 1: Stand with feet hip-width apart.\nStep 2: Imagine roots growing from your feet into solid rock.\nStep 3: Breathe and feel yourself held by what is unshakable.\nStep 4: Ask: "What foundation am I building on?"',
  },
  // Week 26
  {
    title: 'Seeds in Soil',
    description: 'Trust where you\'re planted',
    category: 'awareness' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit comfortably and close your eyes.\nStep 2: Imagine yourself as a seed in soil.\nStep 3: Breathe and trust the darkness around you.\nStep 4: Ask: "What is growing in me that I can\'t yet see?"',
  },
  // Week 27
  {
    title: 'Mustard Seed Faith',
    description: 'Honor the small beginnings',
    category: 'self-compassion' as const,
    duration: '5 min',
    instructions: 'Step 1: Hold a small object in your hand.\nStep 2: Breathe and notice its smallness.\nStep 3: Say to yourself: "Small things matter."\nStep 4: Trust that small faith can grow.',
  },
  // Week 28
  {
    title: 'Treasure Seeking',
    description: 'Notice what you\'re willing to give up',
    category: 'awareness' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit quietly and close your eyes.\nStep 2: Imagine finding a treasure buried in a field.\nStep 3: Breathe and ask: "What would I give up to have this?"\nStep 4: Notice what arises in your body.',
  },
  // Week 29
  {
    title: 'Narrow Gate',
    description: 'Feel the barriers you must pass through',
    category: 'movement' as const,
    duration: '6 min',
    instructions: 'Step 1: Stand and imagine a narrow doorway.\nStep 2: Breathe and notice what you must leave behind to pass through.\nStep 3: Step forward, releasing what doesn\'t fit.\nStep 4: Trust that the way is narrow but leads to life.',
  },
  // Week 30
  {
    title: 'Bearing Burdens',
    description: 'Practice carrying one another',
    category: 'self-compassion' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Imagine someone placing their burden in your hands.\nStep 3: Breathe and feel the weight without collapsing.\nStep 4: Ask: "How can I carry this with love?"',
  },
  // Week 31
  {
    title: 'Feeding the Multitude',
    description: 'Trust that there is enough',
    category: 'breath' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit comfortably and place both hands on your belly.\nStep 2: Breathe in, imagining abundance filling you.\nStep 3: Breathe out, releasing scarcity and fear.\nStep 4: Repeat, trusting that there is enough.',
  },
  // Week 32
  {
    title: 'Walking on Water',
    description: 'Step out in faith and doubt',
    category: 'movement' as const,
    duration: '8 min',
    instructions: 'Step 1: Stand and imagine stepping onto water.\nStep 2: Breathe and notice the fear in your body.\nStep 3: Step forward anyway, trusting you\'ll be held.\nStep 4: Ask: "Where is Jesus calling me to step out?"',
  },
  // Week 33
  {
    title: 'Transfiguration Light',
    description: 'See the divine in the ordinary',
    category: 'awareness' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit in a space with natural light.\nStep 2: Close your eyes and notice the light on your face.\nStep 3: Breathe and imagine seeing someone shine with divine light.\nStep 4: Ask: "Where have I seen the divine in someone?"',
  },
  // Week 34
  {
    title: 'Widow\'s Offering',
    description: 'Give from your poverty',
    category: 'release' as const,
    duration: '6 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Imagine giving away something precious.\nStep 3: Breathe and notice the fear of not having enough.\nStep 4: Release the fear and trust that giving is sacred.',
  },
  // Week 35
  {
    title: 'Lazarus Rising',
    description: 'Call forth what was dead',
    category: 'breath' as const,
    duration: '8 min',
    instructions: 'Step 1: Lie down or sit comfortably.\nStep 2: Breathe in deeply, imagining life returning.\nStep 3: Breathe out, releasing death and decay.\nStep 4: Repeat, trusting that resurrection is possible.',
  },
  // Week 36
  {
    title: 'Gratitude Breath',
    description: 'Give thanks in all circumstances',
    category: 'breath' as const,
    duration: '5 min',
    instructions: 'Step 1: Sit comfortably and place one hand on your heart.\nStep 2: Breathe in, naming something you\'re grateful for.\nStep 3: Breathe out, releasing complaint or resentment.\nStep 4: Repeat, cultivating gratitude.',
  },
  // Week 37
  {
    title: 'Returning to Say Thank You',
    description: 'Practice recognition and gratitude',
    category: 'movement' as const,
    duration: '7 min',
    instructions: 'Step 1: Stand and imagine walking away from a blessing.\nStep 2: Pause and turn around.\nStep 3: Walk back, saying: "Thank you."\nStep 4: Notice how gratitude changes your body.',
  },
  // Week 38
  {
    title: 'Harvest Humility',
    description: 'Acknowledge dependence on grace',
    category: 'grounding' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Breathe and name what you\'ve received.\nStep 3: Acknowledge that you didn\'t earn it.\nStep 4: Say: "I am dependent on grace."',
  },
  // Week 39
  {
    title: 'Trusting Provision',
    description: 'Release anxiety about tomorrow',
    category: 'release' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit comfortably and place both hands on your belly.\nStep 2: Breathe in, imagining provision for today.\nStep 3: Breathe out, releasing worry about tomorrow.\nStep 4: Repeat, trusting that you will be cared for.',
  },
  // Week 40
  {
    title: 'Watching and Waiting',
    description: 'Practice patient expectation',
    category: 'awareness' as const,
    duration: '12 min',
    instructions: 'Step 1: Sit in a quiet space and close your eyes.\nStep 2: Breathe slowly and wait without agenda.\nStep 3: Notice the urge to fill the silence.\nStep 4: Resist the urge and simply wait.',
  },
  // Week 41
  {
    title: 'Communion of Saints',
    description: 'Feel the cloud of witnesses',
    category: 'awareness' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit quietly and imagine those who have gone before.\nStep 2: Breathe and feel their presence surrounding you.\nStep 3: Say their names aloud or in your heart.\nStep 4: Trust that you are not alone.',
  },
  // Week 42
  {
    title: 'Alpha and Omega',
    description: 'Hold the beginning and the end',
    category: 'breath' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit comfortably and place both hands on your heart.\nStep 2: Breathe in, saying: "Beginning."\nStep 3: Breathe out, saying: "End."\nStep 4: Repeat, trusting that Christ holds both.',
  },
  // Week 43
  {
    title: 'Return to Advent',
    description: 'Prepare to wait again',
    category: 'grounding' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit with your hands open in your lap.\nStep 2: Breathe and notice the cycle returning.\nStep 3: Release the need for newness.\nStep 4: Trust that waiting is sacred.',
  },
  // Week 44 - Advent Begins
  {
    title: 'Carrying the Weight',
    description: 'Feel what you\'ve been holding',
    category: 'awareness' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit or stand and imagine holding a heavy weight.\nStep 2: Notice where you feel heaviness in your body.\nStep 3: Breathe into that heaviness without trying to lift it.\nStep 4: Ask: "What burdens am I carrying?"',
  },
  // Week 45
  {
    title: 'Watching in Darkness',
    description: 'Keep vigil in the unknown',
    category: 'awareness' as const,
    duration: '12 min',
    instructions: 'Step 1: Sit in a dark or dimly lit space.\nStep 2: Close your eyes and breathe slowly.\nStep 3: Notice the darkness without fear.\nStep 4: Trust that light is coming.',
  },
  // Week 46
  {
    title: 'Breath Before Promise',
    description: 'Make space for the holy',
    category: 'breath' as const,
    duration: '5 min',
    instructions: 'Step 1: Sit comfortably and place one hand on your heart.\nStep 2: Breathe in slowly, creating space.\nStep 3: Breathe out, releasing what fills that space.\nStep 4: Repeat, making room for the holy to arrive.',
  },
  // Week 47
  {
    title: 'Opening Your Hands',
    description: 'Receive and let go',
    category: 'release' as const,
    duration: '7 min',
    instructions: 'Step 1: Sit with your hands in tight fists.\nStep 2: Breathe in and slowly open your hands.\nStep 3: Breathe out, releasing what you\'re gripping.\nStep 4: Repeat, practicing openness.',
  },
  // Week 48 - Christmas
  {
    title: 'Incarnate Touch',
    description: 'Feel God in flesh',
    category: 'self-compassion' as const,
    duration: '8 min',
    instructions: 'Step 1: Place both hands on your body—arms, legs, face.\nStep 2: Breathe and feel the warmth of your own touch.\nStep 3: Say: "God became flesh like mine."\nStep 4: Honor your body as sacred.',
  },
  // Week 49
  {
    title: 'Joy Embodied',
    description: 'Celebrate with your whole body',
    category: 'movement' as const,
    duration: '6 min',
    instructions: 'Step 1: Stand and raise your arms overhead.\nStep 2: Breathe in deeply, feeling joy rise.\nStep 3: Lower your arms and breathe out, releasing sorrow.\nStep 4: Repeat, celebrating with your body.',
  },
  // Week 50 - Epiphany
  {
    title: 'Following the Star',
    description: 'Notice what guides you',
    category: 'awareness' as const,
    duration: '10 min',
    instructions: 'Step 1: Sit quietly and close your eyes.\nStep 2: Imagine a light guiding you forward.\nStep 3: Breathe and ask: "What is guiding me?"\nStep 4: Trust the light you see.',
  },
  // Week 51
  {
    title: 'Light Revealed',
    description: 'See what was hidden',
    category: 'awareness' as const,
    duration: '8 min',
    instructions: 'Step 1: Sit in a space with natural light.\nStep 2: Close your eyes and notice the light on your face.\nStep 3: Breathe and ask: "What is being revealed to me?"\nStep 4: Open your eyes and see with new sight.',
  },
  // Week 52
  {
    title: 'Everyday Sacred',
    description: 'Find the holy in the ordinary',
    category: 'grounding' as const,
    duration: '5 min',
    instructions: 'Step 1: Stand or sit with feet flat on the ground.\nStep 2: Notice the sensation of your feet touching the floor.\nStep 3: Breathe slowly and name three ordinary things you\'re grateful for.\nStep 4: Feel the sacred in the everyday.',
  },
];

/**
 * Seed somatic exercises if database is empty
 */
async function seedSomaticExercisesIfEmpty(app: App): Promise<void> {
  try {
    // Check if exercises already exist
    const existing = await app.db
      .select()
      .from(schema.somaticExercises)
      .limit(1);

    if (existing.length > 0) {
      app.logger.info('Somatic exercises already seeded');
      return;
    }

    app.logger.info('Auto-seeding somatic exercises...');

    await app.db.insert(schema.somaticExercises).values(SOMATIC_EXERCISES);

    app.logger.info(
      { exercisesCreated: SOMATIC_EXERCISES.length },
      'Somatic exercises created'
    );
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to seed somatic exercises');
    throw error;
  }
}

/**
 * Seed weekly themes and daily content if database is empty
 */
export async function autoSeedThemesIfEmpty(app: App): Promise<void> {
  try {
    // First seed somatic exercises (required for weekly themes)
    await seedSomaticExercisesIfEmpty(app);

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

    // Fetch all somatic exercises to assign to themes
    const exercises = await app.db
      .select()
      .from(schema.somaticExercises);

    if (!exercises.length) {
      app.logger.error({}, 'No somatic exercises found. Cannot seed themes with featured exercises.');
      throw new Error('Somatic exercises must be seeded before themes');
    }

    app.logger.info({ exerciseCount: exercises.length }, 'Fetched somatic exercises for assignment');

    // Determine which theme should start based on current date
    // The 52-exercise array starts with Week 1 (Ordinary Time, late January)
    // So we always start at index 0 - the exercises are paired with themes in order
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const currentMonth = pacificTime.getMonth(); // 0-11
    const currentDay = pacificTime.getDate();

    // Calculate which week of the year we're in to determine starting theme index
    let startingThemeIndex = 0;

    // Late January (after Epiphany) - Ordinary Time
    if (currentMonth === 0 && currentDay > 23) {
      startingThemeIndex = 0; // Week 1 - Ordinary Time
    } else if (currentMonth === 1) {
      // February - weeks 2-4 of Ordinary Time
      startingThemeIndex = 1;
    } else if (currentMonth === 2) {
      // March - weeks 5-9, mostly Lent
      startingThemeIndex = 4;
    } else if (currentMonth === 3) {
      // April - weeks 10-14, Easter
      startingThemeIndex = 9;
    } else if (currentMonth === 4) {
      // May - weeks 15-18, Ascension/Pentecost
      startingThemeIndex = 14;
    } else if (currentMonth > 4 && currentMonth < 11) {
      // June-October - Ordinary Time (weeks 17-40)
      const weekOfYear = Math.floor((currentDay + 30 * currentMonth) / 7) - 23; // approximate
      startingThemeIndex = Math.max(16, Math.min(39, weekOfYear));
    } else if (currentMonth === 10) {
      // November - weeks 41-43
      startingThemeIndex = 40;
    } else if (currentMonth === 11) {
      // December - weeks 44-49, Advent and Christmas
      startingThemeIndex = 43;
    }

    app.logger.info(
      { currentMonth, currentDay, startingThemeIndex, totalExercises: exercises.length },
      'Calculated starting theme index based on current date (52-exercise pairing)'
    );

    const startDate = new Date(getNextMondayPacific());
    startDate.setHours(0, 0, 0, 0);

    const themesToCreate = [];
    for (let i = 0; i < LITURGICAL_THEMES.length; i++) {
      // Rotate through themes starting from the calculated index
      const themeIndex = (startingThemeIndex + i) % LITURGICAL_THEMES.length;
      const themeData = LITURGICAL_THEMES[themeIndex];
      const weekDate = new Date(startDate);
      weekDate.setDate(weekDate.getDate() + i * 7);

      // Cycle through exercises: week 0 gets exercise 0, week 1 gets exercise 1, etc.
      const exerciseIndex = i % exercises.length;
      const featuredExerciseId = exercises[exerciseIndex].id;

      const themeRecord = {
        weekStartDate: weekDate.toISOString().split('T')[0],
        liturgicalSeason: themeData.season,
        themeTitle: themeData.title,
        themeDescription: themeData.description,
        featuredExerciseId,
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
      const themeData = LITURGICAL_THEMES[(startingThemeIndex + i) % LITURGICAL_THEMES.length];
      const seasonWeek = `${createdThemes[i].liturgicalSeason}-${((i % 52) % 13) + 1}`;

      const dailyContent = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const content = getDailyContent(seasonWeek, dayOfWeek, i, themeData);

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
      {
        themesCreated: createdThemes.length,
        dailyContentCreated: createdThemes.length * 7,
        exercisesAssigned: exercises.length,
        exerciseCycleLength: exercises.length,
      },
      'Auto-seeding complete: 52 weeks of themes with daily content and featured exercises created'
    );
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to auto-seed themes');
    throw error;
  }
}
