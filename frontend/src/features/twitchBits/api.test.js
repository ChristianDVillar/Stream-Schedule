import {
  getTwitchBits,
  getTwitchDashboardStats,
} from './api';
import { apiClient } from '../../shared/api/client';

jest.mock('../../shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('features/twitchBits/api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads bits with selected format', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getTwitchBits('total');
    expect(apiClient.get).toHaveBeenCalledWith('/user/twitch-bits?format=total');
  });

  it('loads dashboard stats endpoint', async () => {
    apiClient.get.mockResolvedValue({ data: {} });
    await getTwitchDashboardStats();
    expect(apiClient.get).toHaveBeenCalledWith('/user/twitch-dashboard-stats');
  });
});
