import { allSettled, createWatch, fork } from 'effector';
import {
  $listeningServices,
  broadcastMessageReceived,
  columnListChanged,
  GroupVm,
  identity,
  MessageVm,
  UserSettingsVm,
} from './workflow';

describe('workflow', () => {
  test('should work', async () => {
    const dataEvent: MessageVm = {
      type: 'usual',
      data: JSON.stringify(
        identity<GroupVm>({
          groupId: 'one',
          groupColumns: ['one'],
        })
      ),
    };

    const settigsEvent: MessageVm = {
      type: 'settings',
      data: JSON.stringify(
        identity<UserSettingsVm>({
          groupId: 'one',
          settingColumns: ['one', 'two'],
        })
      ),
    };

    const scope = fork({
      values: [[$listeningServices, ['usual', 'settings']]],
    });
    const watcherFn = vi.fn();
    createWatch({ unit: columnListChanged, scope, fn: watcherFn });

    await allSettled(broadcastMessageReceived, {
      scope,
      params: dataEvent,
    });
    await allSettled(broadcastMessageReceived, {
      scope,
      params: settigsEvent,
    });

    expect(watcherFn).toBeCalledWith(['one is not synced']);
  });
});
