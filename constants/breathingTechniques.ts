
export interface BreathingTechnique {
  id: string;
  title: string;
  description: string;
  duration: string;
  instructions: string[];
}

export const BREATHING_TECHNIQUES: BreathingTechnique[] = [
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    description: 'A grounding breath pattern used by contemplatives and practitioners alike to restore calm and presence.',
    duration: '4 minutes',
    instructions: [
      'Find a comfortable seated position. Rest your hands gently in your lap.',
      'Breathe in slowly through your nose for 4 counts. Feel your chest and belly expand.',
      'Hold your breath gently for 4 counts. Stay still and present.',
      'Exhale slowly through your mouth for 4 counts. Let everything release.',
      'Hold empty for 4 counts. Rest in the stillness.',
      'Repeat this cycle 4 times. Let each breath be an act of trust.',
    ],
  },
  {
    id: '4-7-8-breathing',
    title: '4-7-8 Breathing',
    description: 'A calming breath practice that soothes the nervous system and invites deep rest.',
    duration: '5 minutes',
    instructions: [
      'Sit or lie down comfortably. Let your body soften.',
      'Close your eyes and take one natural breath to settle in.',
      'Inhale quietly through your nose for 4 counts.',
      'Hold your breath for 7 counts. Let your body receive this pause.',
      'Exhale completely through your mouth for 8 counts, making a gentle whooshing sound.',
      'This is one cycle. Repeat 4 times. Notice how your body begins to quiet.',
    ],
  },
  {
    id: 'diaphragmatic-breathing',
    title: 'Diaphragmatic Breathing',
    description: 'A foundational breath practice that reconnects you with your body\'s natural rhythm of breathing.',
    duration: '5 minutes',
    instructions: [
      'Sit comfortably or lie on your back. Let your shoulders drop away from your ears.',
      'Place one hand on your chest and one hand on your belly, just below your ribs.',
      'Breathe in slowly through your nose. Notice which hand rises.',
      'Guide your breath so that only the belly hand rises. The chest hand stays still.',
      'Exhale slowly through pursed lips. Feel the belly hand fall.',
      'Take 5 slow, full breaths this way. Let each one be a gentle homecoming to your body.',
    ],
  },
  {
    id: 'alternate-nostril-breathing',
    title: 'Alternate Nostril Breathing',
    description: 'Known as Nadi Shodhana, this ancient practice balances the body\'s energy and quiets a restless mind.',
    duration: '5 minutes',
    instructions: [
      'Sit comfortably with your spine gently upright. Rest your left hand in your lap.',
      'Bring your right hand to your face. Rest your index and middle fingers between your eyebrows.',
      'Close your right nostril with your right thumb. Inhale slowly through your left nostril.',
      'Close your left nostril with your ring finger. Release your thumb and exhale through your right nostril.',
      'Inhale through your right nostril. Then close it with your thumb and exhale through your left.',
      'This is one complete cycle. Repeat for 5 cycles. Let the rhythm become a quiet prayer.',
    ],
  },
  {
    id: 'coherent-breathing',
    title: 'Coherent Breathing',
    description: 'A gentle, rhythmic breath that brings your heart and breath into harmony — a practice of inner peace.',
    duration: '5 minutes',
    instructions: [
      'Sit or lie down in a comfortable position. Close your eyes if that feels safe.',
      'Begin to breathe in slowly and evenly through your nose for 5 counts.',
      'Without pausing, exhale slowly and evenly through your nose for 5 counts.',
      'Keep this steady rhythm — 5 in, 5 out — without forcing or straining.',
      'If your mind wanders, gently return to counting. Each return is an act of grace.',
      'Continue for 5 minutes. Notice a growing sense of stillness and coherence within.',
    ],
  },
  {
    id: 'sighing-breath',
    title: 'Sighing Breath',
    description: 'A physiological sigh that rapidly releases tension and resets the nervous system.',
    duration: '3 minutes',
    instructions: [
      'Sit comfortably. Let your body be at ease.',
      'Take a deep, full inhale through your nose — filling your lungs completely.',
      'At the top of that inhale, take one short extra sniff through your nose to fully top off your lungs.',
      'Now release a long, slow exhale through your mouth. Let it all go.',
      'Feel the release in your chest, your shoulders, your jaw.',
      'Repeat 3 times. Each sigh is permission to let go of what you have been carrying.',
    ],
  },
  {
    id: 'centering-prayer-breath',
    title: 'Centering Prayer Breath',
    description: 'A contemplative practice where breath becomes prayer — an opening of the heart to the presence of God.',
    duration: '5 minutes',
    instructions: [
      'Find a quiet place. Sit comfortably and close your eyes.',
      'Take a few natural breaths to arrive in this moment.',
      'As you inhale, silently receive the word "Come." Let it be an invitation, not a demand.',
      'As you exhale, gently release the word "Lord." Offer it as a surrender.',
      'When thoughts arise, simply return to the breath and the words. There is no failure here.',
      'Continue for 5 minutes. Let your breath become a living prayer of openness and trust.',
    ],
  },
  {
    id: 'breath-of-gratitude',
    title: 'Breath of Gratitude',
    description: 'A simple practice of receiving goodness — letting gratitude move through the body with each breath.',
    duration: '5 minutes',
    instructions: [
      'Sit quietly. Let your hands rest open in your lap, palms facing upward.',
      'Take a slow, full inhale through your nose.',
      'As you breathe in, bring to mind one thing you are grateful for — however small.',
      'Hold the breath briefly. Let the gratitude settle into your body.',
      'Exhale slowly and whisper or silently say "thank you."',
      'Repeat for 5 breaths, choosing something different each time. Let gratitude become a bodily practice, not just a thought.',
    ],
  },
];
