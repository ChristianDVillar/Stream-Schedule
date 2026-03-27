import {
  getPublicStreamerEvents,
  subscribeStreamReminder,
} from './api';
import { apiClient } from '../../shared/api/client';

jest.mock('../../shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('features/publicStream/api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encodes username when loading events', async () => {
    apiClient.get.mockResolvedValue({ data: { events: [] } });
    await getPublicStreamerEvents('Test User');
    expect(apiClient.get).toHaveBeenCalledWith('/streamer/Test%20User/events');
  });

  it('posts reminder subscription payload', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    await subscribeStreamReminder('streamer-x', 'user@email.com');
    expect(apiClient.post).toHaveBeenCalledWith('/streamer/streamer-x/remind', {
      email: 'user@email.com',
    });
  });
});
