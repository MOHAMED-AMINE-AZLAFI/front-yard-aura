import { photo } from './images';

export type Category = {
  name: string;
  shortName: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  image: string;
  imageAlt: string;
  accent: string;
  cards: Array<{
    title: string;
    description: string;
    image: string;
    placement: 'top' | 'center' | 'bottom';
  }>;
  featuredArticles: string[];
};

export const CATEGORIES: Category[] = [
  {
    name: 'Small Front Yard Landscaping Ideas',
    shortName: 'Small Front Yards',
    slug: 'small-front-yard-landscaping-ideas',
    description: 'Compact curb appeal ideas for smaller American front yards.',
    seoTitle: 'Small Front Yard Landscaping Ideas',
    seoDescription: 'Small front yard landscaping ideas for American homes, including compact curb appeal, planting beds, walkways, and low maintenance layouts.',
    intro: 'Small front yards can feel polished and expensive when every inch has a purpose. This category is built for compact American homes that need curb appeal, layered planting, attractive walkways, and front entry definition without visual clutter.',
    image: photo('photo-1600047509807-ba8f99d2cdde'),
    imageAlt: 'Small American front yard with polished landscaping and a welcoming entry',
    accent: 'Compact Curb Appeal',
    cards: [
      { title: 'Entry-Framing Plants', description: 'Use height near the doorway and low borders near the path.', image: photo('photo-1600047509807-ba8f99d2cdde'), placement: 'bottom' },
      { title: 'Narrow Walkway Layers', description: 'Create depth with slim planting bands and clean edging.', image: photo('photo-1564013799919-ab600027ffc6'), placement: 'top' },
      { title: 'Tiny Lawn Upgrade', description: 'Make a small lawn feel intentional with sharp borders.', image: photo('photo-1512917774080-9991f1c4c750'), placement: 'center' }
    ],
    featuredArticles: [
      'Small Front Yard Ideas That Make a Home Look Bigger',
      'Compact Front Yard Planting Plans for Better Curb Appeal',
      'Small Walkway Landscaping Ideas for Narrow Entries'
    ]
  },
  {
    name: 'Modern Front Yard Landscaping',
    shortName: 'Modern Front Yards',
    slug: 'modern-front-yard-landscaping',
    description: 'Clean, upscale front yard designs with contemporary structure.',
    seoTitle: 'Modern Front Yard Landscaping Ideas',
    seoDescription: 'Modern front yard landscaping ideas with clean lines, architectural planting, stone paths, lighting, and luxury curb appeal inspiration.',
    intro: 'Modern front yard landscaping is about restraint, proportion, and confident materials. This category focuses on architectural planting, structured walkways, premium lighting, and simple palettes that make a home feel current and high-value.',
    image: photo('photo-1600585154340-be6161a56a0c'),
    imageAlt: 'Modern luxury American home with clean front yard landscaping',
    accent: 'Modern Curb Appeal',
    cards: [
      { title: 'Architectural Planting', description: 'Repeat sculptural plants for a calm, premium rhythm.', image: photo('photo-1600585154340-be6161a56a0c'), placement: 'bottom' },
      { title: 'Minimal Path Lighting', description: 'Low, warm lighting makes modern lines feel welcoming.', image: photo('photo-1512917774080-9991f1c4c750'), placement: 'center' },
      { title: 'Stone And Lawn Contrast', description: 'Balance hardscape geometry with softened green edges.', image: photo('photo-1600047509358-9dc75507daeb'), placement: 'top' }
    ],
    featuredArticles: [
      'Modern Front Yard Landscaping Ideas for Clean Curb Appeal',
      'How to Use Stone, Grass, and Lighting in a Modern Front Yard',
      'Minimal Planting Ideas for Contemporary American Homes'
    ]
  },
  {
    name: 'Front Yard Landscaping On A Budget',
    shortName: 'Budget Landscaping',
    slug: 'front-yard-landscaping-on-a-budget',
    description: 'High-impact front yard upgrades that look premium without overspending.',
    seoTitle: 'Front Yard Landscaping On A Budget',
    seoDescription: 'Budget front yard landscaping ideas that improve curb appeal with mulch, edging, affordable plants, walkways, lighting, and simple design upgrades.',
    intro: 'Budget landscaping does not have to look cheap. The best affordable front yard ideas rely on clean edges, repeated plants, fresh mulch, smart lighting, and one strong focal point that makes the entire exterior feel intentional.',
    image: photo('photo-1598228723793-52759bba239c'),
    imageAlt: 'Affordable American front yard landscaping with clean curb appeal',
    accent: 'Smart Upgrades',
    cards: [
      { title: 'Fresh Mulch Reset', description: 'A crisp mulch refresh gives beds instant definition.', image: photo('photo-1558904541-efa843a96f01'), placement: 'bottom' },
      { title: 'Affordable Edging', description: 'Define every line before adding more plants.', image: photo('photo-1568605114967-8130f3a36994'), placement: 'top' },
      { title: 'One Strong Focal Point', description: 'A planter, tree, or path upgrade can anchor the yard.', image: photo('photo-1570129477492-45c003edd2be'), placement: 'center' }
    ],
    featuredArticles: [
      'Front Yard Landscaping Ideas on a Budget That Still Look Expensive',
      'Cheap Curb Appeal Upgrades With Big Visual Impact',
      'Budget Flower Beds and Edging Ideas for American Homes'
    ]
  },
  {
    name: 'Front Yard Flower Bed Ideas',
    shortName: 'Flower Beds',
    slug: 'front-yard-flower-bed-ideas',
    description: 'Elegant flower bed inspiration for color, texture, and curb appeal.',
    seoTitle: 'Front Yard Flower Bed Ideas',
    seoDescription: 'Front yard flower bed ideas for American homes, including layered planting, seasonal color, borders, foundation beds, and curb appeal inspiration.',
    intro: 'Front yard flower beds create the emotional first impression of a home. This category focuses on layered planting, seasonal color, foundation beds, borders, and polished combinations that photograph beautifully for Pinterest.',
    image: photo('photo-1558904541-efa843a96f01'),
    imageAlt: 'Front yard flower bed with colorful planting and luxury curb appeal',
    accent: 'Seasonal Color',
    cards: [
      { title: 'Layered Foundation Beds', description: 'Mix evergreen structure with seasonal flowers.', image: photo('photo-1466692476868-aef1dfb1e735'), placement: 'bottom' },
      { title: 'Soft Cottage Color', description: 'Use romantic color while keeping the edges refined.', image: photo('photo-1585320806297-9794b3e4eeae'), placement: 'center' },
      { title: 'Entry Flower Moment', description: 'Frame the front door with blooms and symmetrical planters.', image: photo('photo-1570129477492-45c003edd2be'), placement: 'top' }
    ],
    featuredArticles: [
      'Front Yard Flower Bed Ideas for Instant Curb Appeal',
      'Foundation Flower Beds That Look Polished All Season',
      'Pinterest-Worthy Flower Bed Layouts for Front Yards'
    ]
  },
  {
    name: 'Front Yard Landscaping With Rocks',
    shortName: 'Rock Landscaping',
    slug: 'front-yard-landscaping-with-rocks',
    description: 'Natural stone, gravel, boulders, and rock garden ideas for front yards.',
    seoTitle: 'Front Yard Landscaping With Rocks',
    seoDescription: 'Front yard landscaping with rocks, including gravel beds, boulders, stone borders, drought-friendly planting, and premium curb appeal ideas.',
    intro: 'Rock landscaping brings structure, contrast, and low-maintenance beauty to the front yard. Use this category for gravel beds, boulder accents, stone borders, and drought-conscious planting that still feels premium.',
    image: photo('photo-1598902108854-10e335adac99'),
    imageAlt: 'Front yard rock landscaping with gravel, stone, and refined planting',
    accent: 'Stone Texture',
    cards: [
      { title: 'Boulder Accent Beds', description: 'Use large stones as sculptural anchors.', image: photo('photo-1598902108854-10e335adac99'), placement: 'bottom' },
      { title: 'Gravel And Green Contrast', description: 'Pair pale gravel with strong evergreen forms.', image: photo('photo-1598902108854-10e335adac99'), placement: 'center' },
      { title: 'Stone Border Lines', description: 'Use rock edging to make planting beds feel finished.', image: photo('photo-1600047509358-9dc75507daeb'), placement: 'top' }
    ],
    featuredArticles: [
      'Front Yard Landscaping With Rocks That Looks Modern',
      'Rock Garden Ideas for Low Maintenance Curb Appeal',
      'How to Use Gravel and Boulders in a Front Yard'
    ]
  },
  {
    name: 'Low Maintenance Front Yard Landscaping',
    shortName: 'Low Maintenance',
    slug: 'low-maintenance-front-yard-landscaping',
    description: 'Elegant front yard ideas designed for easy upkeep.',
    seoTitle: 'Low Maintenance Front Yard Landscaping',
    seoDescription: 'Low maintenance front yard landscaping ideas with evergreen plants, mulch, rocks, simple layouts, drought-tolerant options, and curb appeal.',
    intro: 'Low maintenance landscaping works best when the design is simple, layered, and durable. This category focuses on evergreen structure, mulch, rock accents, easy-care planting, and layouts that stay polished with less effort.',
    image: photo('photo-1600047509807-ba8f99d2cdde'),
    imageAlt: 'Low maintenance landscaped front yard of a luxury American home',
    accent: 'Easy Care',
    cards: [
      { title: 'Evergreen Framework', description: 'Build the yard around plants that hold structure year-round.', image: photo('photo-1600585154340-be6161a56a0c'), placement: 'bottom' },
      { title: 'Mulch And Stone Balance', description: 'Reduce maintenance with clean material zones.', image: photo('photo-1598902108854-10e335adac99'), placement: 'top' },
      { title: 'Simple Plant Repetition', description: 'Fewer plant types can make the yard feel more expensive.', image: photo('photo-1600047509807-ba8f99d2cdde'), placement: 'center' }
    ],
    featuredArticles: [
      'Low Maintenance Front Yard Landscaping Ideas That Look Premium',
      'Easy-Care Plants for Front Yard Curb Appeal',
      'Simple Front Yard Layouts With Less Upkeep'
    ]
  },
  {
    name: 'Walkway Landscaping Ideas',
    shortName: 'Walkways',
    slug: 'walkway-landscaping-ideas',
    description: 'Paths, borders, lighting, and planting ideas around front walkways.',
    seoTitle: 'Walkway Landscaping Ideas',
    seoDescription: 'Walkway landscaping ideas for front yards, including path borders, lighting, flower beds, stone paths, and elegant curb appeal inspiration.',
    intro: 'The front walkway sets the pace for the whole home. This category is for path borders, stone walks, lighting, plant layering, and entry sequences that make visitors feel guided and welcomed.',
    image: photo('photo-1582268611958-ebfd161ef9cf'),
    imageAlt: 'Elegant front walkway landscaping with lights and planting borders',
    accent: 'Path Design',
    cards: [
      { title: 'Border Planting Rhythm', description: 'Repeat low plants to create a calm path edge.', image: photo('photo-1564013799919-ab600027ffc6'), placement: 'bottom' },
      { title: 'Warm Path Lighting', description: 'Use lighting to make the walkway feel premium at dusk.', image: photo('photo-1512917774080-9991f1c4c750'), placement: 'center' },
      { title: 'Stone Walkway Texture', description: 'Natural stone adds depth and permanence.', image: photo('photo-1598902108854-10e335adac99'), placement: 'top' }
    ],
    featuredArticles: [
      'Walkway Landscaping Ideas for a More Elegant Entry',
      'Front Path Border Ideas With Plants and Lighting',
      'Stone Walkway Ideas for American Front Yards'
    ]
  },
  {
    name: 'Curb Appeal Landscaping Ideas',
    shortName: 'Curb Appeal',
    slug: 'curb-appeal-landscaping-ideas',
    description: 'Front yard landscaping ideas that make the whole home look more valuable.',
    seoTitle: 'Curb Appeal Landscaping Ideas',
    seoDescription: 'Curb appeal landscaping ideas for front yards, including planting, walkways, lighting, flower beds, porch styling, and luxury exterior inspiration.',
    intro: 'Curb appeal landscaping is the art of making a home feel cared for before anyone reaches the front door. This category connects planting, lighting, walkways, porch styling, and polished lawn edges into one strong first impression.',
    image: photo('photo-1564013799919-ab600027ffc6'),
    imageAlt: 'Luxury American home with high curb appeal landscaping',
    accent: 'First Impression',
    cards: [
      { title: 'Entry Symmetry', description: 'Use balanced planting to make the facade feel composed.', image: photo('photo-1600585154340-be6161a56a0c'), placement: 'bottom' },
      { title: 'Porch And Path Styling', description: 'Connect the porch to the walkway with repeated materials.', image: photo('photo-1570129477492-45c003edd2be'), placement: 'top' },
      { title: 'Fresh Edges Everywhere', description: 'Clean borders are the fastest signal of care.', image: photo('photo-1600047509807-ba8f99d2cdde'), placement: 'center' }
    ],
    featuredArticles: [
      'Curb Appeal Landscaping Ideas That Make a Home Look Expensive',
      'Front Yard Upgrades Buyers Notice First',
      'How to Combine Lighting, Beds, and Walkways for Curb Appeal'
    ]
  }
] as const;

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function getRelatedCategories(slug: string, count = 3) {
  return CATEGORIES.filter((category) => category.slug !== slug).slice(0, count);
}
