export const TRADE_OPTIONS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Mason/Bricklayer",
  "AC Technician",
  "Generator Technician",
  "Inverter/Solar Installer",
  "Tiler",
  "POP Ceiling Installer",
  "Aluminum/Window Fabricator",
  "Roofing Specialist",
  "Interior Decorator",
  "Furniture Repair",
  "CCTV Installer",
  "Satellite/DSTV Installer",
  "Home Network/WiFi Technician",
  "Appliance Repair (fridge, washing machine)",
  "Pest Control",
  "Cleaner (deep cleaning)",
  "Dry Cleaner",
  "Movers/Relocation Help",
  "Event Decorator",
  "Photographer",
  "Makeup Artist",
  "Mechanic",
] as const;

export type Trade = (typeof TRADE_OPTIONS)[number];

// Value used when the client's issue doesn't match any suggestion for
// their chosen trade — they describe it freehand in the description box.
export const OTHER_ISSUE = "Other";

// Common issues per trade, shown as a second dropdown once a trade is
// picked. Always exactly 5 suggestions; "Other" is appended in the UI,
// not stored here, so it stays a single source of truth.
export const ISSUE_SUGGESTIONS: Record<Trade, string[]> = {
  Electrician: [
    "Power outage / no light",
    "Sparking socket or switch",
    "Circuit breaker keeps tripping",
    "Faulty wiring",
    "Installation of new sockets/fittings",
  ],
  Plumber: [
    "Pipe burst / leaking pipe",
    "Blocked toilet",
    "Blocked drainage/sink",
    "No water pressure",
    "Leaking tap",
  ],
  Carpenter: [
    "Broken door/window frame",
    "Cabinet or wardrobe repair",
    "Custom furniture request",
    "Squeaky/broken hinges",
    "Wood flooring repair",
  ],
  Painter: [
    "Wall repainting",
    "Damp/peeling paint",
    "Fence/gate painting",
    "Ceiling painting",
    "Color consultation",
  ],
  "Mason/Bricklayer": [
    "Cracked wall repair",
    "Block wall construction",
    "Fence wall building",
    "Plastering",
    "Foundation repair",
  ],
  "AC Technician": [
    "AC not cooling",
    "AC installation",
    "AC servicing/cleaning",
    "Strange noise from AC",
    "AC leaking water",
  ],
  "Generator Technician": [
    "Generator not starting",
    "Generator servicing",
    "Generator installation",
    "Excess fuel consumption",
    "Unusual noise from generator",
  ],
  "Inverter/Solar Installer": [
    "Inverter not charging",
    "New inverter/solar installation",
    "Battery replacement",
    "System upgrade",
    "Inverter beeping/making noise",
  ],
  Tiler: [
    "Cracked/broken tiles",
    "New tile installation",
    "Tile regrouting",
    "Bathroom retiling",
    "Floor leveling before tiling",
  ],
  "POP Ceiling Installer": [
    "New POP ceiling design",
    "Cracked/damaged ceiling",
    "Ceiling water damage repair",
    "Ceiling lighting installation",
    "Ceiling repainting",
  ],
  "Aluminum/Window Fabricator": [
    "Broken window glass",
    "New window installation",
    "Sliding door repair",
    "Burglary-proof fabrication",
    "Window/door frame alignment",
  ],
  "Roofing Specialist": [
    "Roof leak",
    "Roof sheet replacement",
    "Full roof installation",
    "Gutter repair",
    "Storm damage repair",
  ],
  "Interior Decorator": [
    "Full room makeover",
    "Furniture arrangement/styling",
    "Wallpaper/decor installation",
    "Curtains and blinds",
    "Lighting design",
  ],
  "Furniture Repair": [
    "Broken chair/table",
    "Upholstery repair",
    "Wardrobe/cabinet fix",
    "Wood polishing/refinishing",
    "Loose joints/hinges",
  ],
  "CCTV Installer": [
    "New CCTV installation",
    "Camera not recording",
    "System not connecting to phone",
    "Camera relocation",
    "Maintenance/servicing",
  ],
  "Satellite/DSTV Installer": [
    "No signal",
    "New dish installation",
    "Dish realignment",
    "Decoder issues",
    "Multi-room setup",
  ],
  "Home Network/WiFi Technician": [
    "Slow/no internet",
    "New network setup",
    "Router configuration",
    "WiFi dead zones",
    "Cable/network point installation",
  ],
  "Appliance Repair (fridge, washing machine)": [
    "Fridge not cooling",
    "Washing machine not spinning",
    "Appliance making noise",
    "Appliance leaking",
    "Appliance won't power on",
  ],
  "Pest Control": [
    "Rodent infestation",
    "Cockroach/insect infestation",
    "Termite treatment",
    "Bed bug treatment",
    "Fumigation service",
  ],
  "Cleaner (deep cleaning)": [
    "Post-construction cleaning",
    "Move-in/move-out cleaning",
    "Regular deep cleaning",
    "Upholstery/carpet cleaning",
    "Window cleaning",
  ],
  "Dry Cleaner": [
    "Suit/agbada dry cleaning",
    "Wedding/traditional attire cleaning",
    "Curtain/duvet cleaning",
    "Stain removal",
    "Ironing/pressing service",
  ],
  "Movers/Relocation Help": [
    "Home relocation",
    "Office relocation",
    "Furniture moving only",
    "Loading/offloading help",
    "Packing service",
  ],
  "Event Decorator": [
    "Birthday party decor",
    "Wedding decor",
    "Corporate event setup",
    "Balloon/theme decoration",
    "Canopy and chairs setup",
  ],
  Photographer: [
    "Event photography",
    "Portrait/studio shoot",
    "Product photography",
    "Videography",
    "Photo editing/retouching",
  ],
  "Makeup Artist": [
    "Bridal makeup",
    "Party/event makeup",
    "Photoshoot makeup",
    "Makeup lessons",
    "Gele/hair styling",
  ],
  Mechanic: [
    "Car won't start",
    "Engine noise/knocking",
    "Brake issues",
    "Routine servicing",
    "Battery/electrical issue",
  ],
};

// Full dispatch lifecycle — replaces the technician app's old
// "new / accepted / completed" shared-pool status enum.
export const JOB_STATUS = {
  PENDING: "pending",
  DISPATCHED: "dispatched",
  ON_THE_WAY: "on_the_way",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// Courier/delivery lifecycle — same shape as JOB_STATUS but a separate
// enum since a courier request is a different entity from a trade job.
export const COURIER_STATUS = {
  PENDING: "pending",       // request posted, no courier yet
  ACCEPTED: "accepted",     // courier accepted, contact info now revealed
  PICKED_UP: "picked_up",
  EN_ROUTE: "en_route",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type CourierStatus = (typeof COURIER_STATUS)[keyof typeof COURIER_STATUS];