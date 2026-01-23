import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import toast from 'react-hot-toast';
import { 
  User, 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock, 
  Eye, 
  Heart, 
  Share2,
  Edit,
  Camera,
  Settings,
  BarChart3,
  Target,
  Star,
  Trophy,
  Activity
} from 'lucide-react';

const Profile = ({ user, token }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      // Fetch user stats
      const statsResponse = await apiClient.get('/user/stats', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setStats(statsResponse.data);

      // Fetch recent activity
      const activityResponse = await apiClient.get('/user/activity', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setRecentActivity(activityResponse.data);

      // Mock achievements data
      setAchievements([
        { id: 1, name: 'First Post', description: 'Published your first content', icon: Star, earned: true, date: '2024-01-15' },
        { id: 2, name: 'Consistency', description: 'Posted for 7 days in a row', icon: Target, earned: true, date: '2024-01-22' },
        { id: 3, name: 'Multi-Platform', description: 'Posted on 3 different platforms', icon: Share2, earned: true, date: '2024-01-25' },
        { id: 4, name: 'Viral Content', description: 'Reached 1000+ views on a single post', icon: TrendingUp, earned: false },
        { id: 5, name: 'Engagement Master', description: 'Achieved 100+ likes on a post', icon: Heart, earned: false },
        { id: 6, name: 'Scheduling Pro', description: 'Scheduled 50 posts', icon: Clock, earned: false }
      ]);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'post_created':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'post_published':
        return <Share2 className="w-4 h-4 text-green-500" />;
      case 'post_scheduled':
        return <Clock className="w-4 h-4 text-purple-500" />;
      case 'achievement_earned':
        return <Award className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };


  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-900 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{user?.username}</h1>
                  <p className="text-gray-600 mb-2">{user?.email}</p>
                  <div className="flex items-center justify-center md:justify-start space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {user?.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="mt-4 md:mt-0 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto md:mx-0"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPosts}</p>
              </div>
              <Edit className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-3xl font-bold text-gray-900">{stats.publishedPosts}</p>
              </div>
              <Share2 className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>{stats.scheduledPosts} scheduled</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+8% from last week</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+15% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shares</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalShares.toLocaleString()}</p>
              </div>
              <Share2 className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+22% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalViews > 0 ? ((stats.totalLikes / stats.totalViews) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Target className="w-4 h-4 mr-1" />
                <span>Target: 5%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.timestamp, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
              <Trophy className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      achievement.earned
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        achievement.earned ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          achievement.earned ? 'text-white' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${
                          achievement.earned ? 'text-yellow-900' : 'text-gray-700'
                        }`}>
                          {achievement.name}
                        </h3>
                        <p className={`text-xs ${
                          achievement.earned ? 'text-yellow-700' : 'text-gray-500'
                        }`}>
                          {achievement.description}
                        </p>
                        {achievement.earned && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Earned {formatDate(achievement.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Progress Goals</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Posts Goal</span>
                <span className="text-sm text-gray-500">{stats.totalPosts}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(stats.totalPosts, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Views Goal</span>
                <span className="text-sm text-gray-500">{stats.totalViews.toLocaleString()}/10K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(stats.totalViews, 10000)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Engagement Goal</span>
                <span className="text-sm text-gray-500">
                  {stats.totalViews > 0 ? ((stats.totalLikes / stats.totalViews) * 100).toFixed(1) : 0}%/5%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${getProgressPercentage(
                      stats.totalViews > 0 ? (stats.totalLikes / stats.totalViews) * 100 : 0, 
                      5
                    )}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 
