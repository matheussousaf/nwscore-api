/* eslint-disable @typescript-eslint/no-unused-vars */
const user = {
  id: 1,
  username: 'lklk',
  wars: [],
  gameClasses: [
    {
      id: 1,
      name: 'Warrior',
    },
    {
      id: 2,
      name: 'Mage',
    },
  ],
};

const war = {
  territory: 'Windsward',
  hour: '12:00',
  attacker: {
    id: 'attacker-id',
    name: 'Example Name',
    faction: 'Marauders', // Marauders (Green) Syndicate (Purple) / Covenant (Yellow)
  },
  defender: {
    id: 'defender-id',
    name: 'Example Name',
    faction: 'Syndicate', // Marauders (Green) Syndicate (Purple) / Covenant (Yellow)
  },
  stats: [
    {
      name: 'Group 1',
      players: [
        {
          name: 'lklk',
          playerClass: 'Musket',
          damage: 10100101,
          healing: 1000000,
          kills: 10,
          deaths: 5,
          assists: 2,
        },
        {
          name: 'guioliveirabr',
          playerClass: 'Healer',
          damage: 10100101,
          healing: 1000000,
          kills: 10,
          deaths: 5,
          assists: 2,
        },
      ],
    },
  ],
};
