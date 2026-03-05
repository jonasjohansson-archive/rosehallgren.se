const base = import.meta.env.BASE_URL;
const img = (path) => `${base}${path}`;

export const projects = [
  {
    id: 'fluffy-encounters',
    title: 'Fluffy Encounters',
    description:
      'Fluffy Encounters joins the 2025 Copenhagen Architecture Biennial with a combined workshop and exhibition dedicated to the possibilities of wool in architecture. The project explores how this ancient fibre — often discarded today — can support slow, circular, and locally rooted material practices. Through hands-on making and curated displays of Nordic collaborations, visitors encounter wool at different stages: raw, processed, reworked, and reimagined through innovative products and value-chain efforts.',
    images: [
      img('images/rose-hallgren-cafx-1.jpg'),
      img('images/rose-hallgren-cafx-2.jpg'),
      img('images/rose-hallgren-cafx-3.jpg'),
    ],
    video: 'https://www.youtube.com/embed/yn3Wk3m__r0',
    house: {
      width: 8,
      depth: 6,
      floors: 2,
      floorHeight: 3,
      roofType: 'gable',
      windowsPerWall: 3,
      doorPosition: 'center',
    },
  },
  {
    id: 'folkbastu',
    title: 'Folkbastu',
    description:
      'A sauna bridge project inspired by Finnish sauna culture, proposed for the Dalénum and Larsberg areas in Lidingö. The project explores craft, sustainability, and provides a place for relaxation and mindfulness.',
    images: [
      img('images/rose-hallgren-folkbastu-01.webp'),
      img('images/rose-hallgren-folkbastu-02.webp'),
      img('images/rose-hallgren-folkbastu-03.webp'),
      img('images/rose-hallgren-folkbastu-04.webp'),
    ],
    house: {
      width: 10,
      depth: 5,
      floors: 1,
      floorHeight: 3.2,
      roofType: 'flat',
      windowsPerWall: 4,
      doorPosition: 'left',
    },
  },
  {
    id: 'coua',
    title: 'C.O.U.A.',
    description:
      'Alma Löv Museum of Unexpected Art. A place created on a meadow over a small stream. "A place to call home", with an interest in lifting forward ornamentation. Can ornamentation create added value in a home? A tangible process where sketching occurs in direct contact with the material and surroundings. Where exploration is the goal, and the goal is not an end.',
    images: [
      img('images/rose-hallgren-coua-01.webp'),
      img('images/rose-hallgren-coua-02.webp'),
      img('images/rose-hallgren-coua-03.webp'),
      img('images/rose-hallgren-coua-04.webp'),
      img('images/rose-hallgren-coua-05.webp'),
    ],
    house: {
      width: 6,
      depth: 8,
      floors: 2,
      floorHeight: 3,
      roofType: 'gable',
      windowsPerWall: 2,
      doorPosition: 'center',
    },
  },
  {
    id: 'tulip',
    title: 'Tulip',
    description:
      'Tulips are the only flower that, after being harvested, continues to grow — a beautiful idea to include in the creation of a vase intended just for the tulip. The vase becomes, in contrast to the flower, a static object that must relate to something living that changes over time. The same richness of variation that we see in the flower. An interpretation of the iconic Delft pyramid.',
    images: [img('images/rose-hallgren-tulip-01.webp')],
    house: {
      width: 5,
      depth: 5,
      floors: 1,
      floorHeight: 3.5,
      roofType: 'hip',
      windowsPerWall: 1,
      doorPosition: 'center',
    },
  },
  {
    id: 'drip-drop-non-stop',
    title: 'Drip Drop Non Stop',
    description:
      'Like the transparent willow leaves that make up the eel in its first stage of life, the viewers, brought together by the currents of life, become aware of their senses. The play between the most basic elements of our surroundings: light, water and sound is embodied by a recurring event, the dripping of water. A meditative state and a stillness, softly entwined under a water surface.',
    images: [
      img('images/rose-hallgren-drip-drop-non-stop-01.webp'),
      img('images/rose-hallgren-drip-drop-non-stop-02.webp'),
      img('images/rose-hallgren-drip-drop-non-stop-03.webp'),
      img('images/rose-hallgren-drip-drop-non-stop-04.webp'),
      img('images/rose-hallgren-drip-drop-non-stop-05.webp'),
    ],
    house: {
      width: 6,
      depth: 6,
      floors: 2,
      floorHeight: 3,
      roofType: 'flat',
      windowsPerWall: 2,
      doorPosition: 'right',
    },
  },
  {
    id: 'malmo-dreaming',
    title: 'Drömmarens Malmö',
    description:
      "Drömmarens Malmö (Malmö Dreaming) is Fanfaluca Collective's contribution to the architecture festival Malmö in the Making. The project consists of two parts, a film that examines the stories of Malmöiter (people of Malmö) and their connection to their city. The second complementary element is a built installation where you can take part in the film in the public space.",
    images: [
      img('images/rose-hallgren-malmo-dreaming-01.webp'),
      img('images/rose-hallgren-malmo-dreaming-02.webp'),
      img('images/rose-hallgren-malmo-dreaming-03.webp'),
      img('images/rose-hallgren-malmo-dreaming-04.webp'),
      img('images/rose-hallgren-malmo-dreaming-05.webp'),
    ],
    video: 'https://www.youtube.com/embed/QohlJKgHG1E',
    house: {
      width: 9,
      depth: 5,
      floors: 1,
      floorHeight: 3.4,
      roofType: 'gable',
      windowsPerWall: 3,
      doorPosition: 'center',
    },
  },
  {
    id: 'photography',
    title: 'Photography',
    description: '',
    images: [
      img('images/photography-01.webp'),
      img('images/photography-02.webp'),
      img('images/photography-03.webp'),
      img('images/photography-04.webp'),
      img('images/photography-05.webp'),
      img('images/photography-06.webp'),
      img('images/photography-07.webp'),
      img('images/photography-08.webp'),
      img('images/photography-09.webp'),
      img('images/photography-10.webp'),
      img('images/photography-11.webp'),
    ],
    house: {
      width: 4,
      depth: 4,
      floors: 3,
      floorHeight: 3,
      roofType: 'flat',
      windowsPerWall: 1,
      doorPosition: 'center',
    },
  },
];
