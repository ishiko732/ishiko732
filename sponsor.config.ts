import { tierPresets } from 'sponsorkit'
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
      preset: tierPresets.xs,
    },
    {
      title: 'Backers',
      preset: tierPresets.base,
    },
    {
      title: 'Sponsors',
      monthlyDollars: 5,
      preset: tierPresets.medium,
    },
    {
      title: 'Silver Sponsors',
      monthlyDollars: 50,
      preset: tierPresets.large,
    },
    {
      title: 'Gold Sponsors',
      monthlyDollars: 100,
      preset: tierPresets.xl,
    },
  ],
})
