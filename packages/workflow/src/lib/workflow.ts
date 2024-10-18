import {
  createEffect,
  createEvent,
  createStore,
  sample,
  split,
} from 'effector';
import { createAction } from './actions';

//types
export type UserSettingsVm = {
  groupId: string;
  settingColumns: string[];
};
export type GroupVm = {
  groupId: string;
  groupColumns: string[];
};
export type MessageVm = {
  type: 'usual' | 'settings';
  data: string;
};

// events
export const broadcastMessageReceived = createEvent<MessageVm>();
export const uiMessageSent = createEvent<string>();
export const groupsRedrawRequired = createEvent<string[]>();
export const columnListChanged = createEvent<string[]>();

// stores
export const $listeningServices = createStore<string[]>([]);
export const $groups = createStore<Record<string, GroupVm>>({});
export const $userSettings = createStore<Record<string, UserSettingsVm>>({});

// effects
export const parseMessageFx = createEffect<MessageVm, GroupVm>();
export const parseSettingsFx = createEffect<MessageVm, UserSettingsVm>();

// logic
split({
  source: sample({
    clock: broadcastMessageReceived,
    source: $listeningServices,
    filter: (services, event) => services.includes(event.type),
    fn: (_, event) => event,
  }),
  match: {
    usualMessage: (message) => message.type === 'usual',
    settingsMessage: (message) => message.type === 'settings',
  },
  cases: {
    usualMessage: parseMessageFx,
    settingsMessage: parseSettingsFx,
  },
});

createAction({
  clock: parseMessageFx.doneData,
  source: { groups: $groups },
  target: { groupsRedrawRequired, $groups },
  fn: (target, { groups }, change) => {
    target.$groups({
      ...groups,
      [change.groupId]: change
    })
    target.groupsRedrawRequired([change.groupId]);
  },
});

createAction({
  clock: parseSettingsFx.doneData,
  source: $userSettings,
  target: { groupsRedrawRequired, $userSettings },
  fn: (target, userSettings, change) => {
    target.$userSettings({ ...userSettings, [change.groupId]: change });
    target.groupsRedrawRequired([change.groupId]);
  },
});

createAction({
  clock: groupsRedrawRequired,
  source: { groups: $groups, userSettings: $userSettings },
  target: { columnListChanged },
  fn: (target, { groups, userSettings }, change) => {
    const updates: string[] = [];
    change.forEach((groupId) => {
      const group = groups[groupId];
      const settings = userSettings[groupId];
      if (
        group !== undefined &&
        settings !== undefined &&
        group.groupColumns.length !== settings.settingColumns.length
      ) {
        updates.push(`${groupId} is not synced`);
      }
    });
    if (updates.length > 0) {
      target.columnListChanged(updates);
    }
    
  },
});

parseMessageFx.use((msg) => {
  return JSON.parse(msg.data);
});
parseSettingsFx.use((msg) => {
  return JSON.parse(msg.data);
});

// functions
export function identity<T>(value: T): T {
  return value;
}