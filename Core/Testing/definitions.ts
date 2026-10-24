import type { PropertyDefinition } from '../Properties/properties'

/** The two-group Status property the card suites group and reassign across. */
export const STATUS_DEF: PropertyDefinition = {
  id: 'prop_status',
  label: 'Status',
  key: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ id: 'opt_Active', key: 'Active', label: 'Active', color: 'blue' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ id: 'opt_Complete', key: 'Complete', label: 'Complete', color: 'green' }],
    },
  ],
}

/** The definitions `fixtures/collection-with-status.json` assigns, by id. */
export const FIXTURE_DEFS: Readonly<Record<string, PropertyDefinition>> = {
  prop_status: {
    id: 'prop_status',
    key: 'Status',
    label: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'upcoming',
        label: 'Upcoming',
        color: 'gray',
        options: [
          { id: 'opt_not_started', key: 'not_started', label: 'not_started' },
          { id: 'opt_opt_open', key: 'opt_open', label: 'opt_open', color: 'green' },
        ],
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        color: 'blue',
        options: [
          { id: 'opt_in_progress', key: 'in_progress', label: 'in_progress', color: 'blue' },
        ],
      },
      {
        id: 'done',
        label: 'Done',
        color: 'green',
        options: [{ id: 'opt_done', key: 'done', label: 'done', color: 'red' }],
      },
    ],
  },
  prop_when: { id: 'prop_when', key: 'Timeframe', label: 'Timeframe', type: 'dateTime' },
}

export const STASHED_AT = '2026-10-01T00:00:00.000Z'
