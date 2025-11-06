import { defineConfig, presets } from 'sponsorkit'

export default defineConfig({
  // GitHub username
  github: {
    login: 'ishiko732',
    type: 'user',
  },

  // Rendering options
  width: 800,
  formats: ['svg'],

  // Sponsor tiers configuration
  tiers: [
    {
      title: 'Past Sponsors',
      monthlyDollars: -1,
      preset: presets.xs,
    },
    {
      title: 'Backers',
      preset: presets.base,
    },
    {
      title: 'Sponsors',
      monthlyDollars: 5,
      preset: presets.medium,
    },
    {
      title: 'Silver Sponsors',
      monthlyDollars: 50,
      preset: presets.large,
    },
    {
      title: 'Gold Sponsors',
      monthlyDollars: 100,
      preset: presets.xl,
    },
  ],
})
