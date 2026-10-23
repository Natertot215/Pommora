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
      options: [{ key: 'Active', label: 'Active', color: 'blue', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ key: 'Complete', label: 'Complete', color: 'green', group_id: 'done' }],
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
          { key: 'not_started', label: 'not_started', group_id: 'upcoming' },
          { key: 'opt_open', label: 'opt_open', color: 'green', group_id: 'upcoming' },
        ],
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        color: 'blue',
        options: [
          { key: 'in_progress', label: 'in_progress', color: 'blue', group_id: 'in_progress' },
        ],
      },
      {
        id: 'done',
        label: 'Done',
        color: 'green',
        options: [{ key: 'done', label: 'done', color: 'red', group_id: 'done' }],
      },
    ],
  },
  prop_when: { id: 'prop_when', key: 'Timeframe', label: 'Timeframe', type: 'dateTime' },
}
