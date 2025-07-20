import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  ArrowLeft, 
  Twitch, 
  Twitter, 
  Instagram, 
  MessageCircle,
  CheckCircle,
  XCircle,
  Link,
  Unlink
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState({
    twitch: false,
    twitter: false,
    instagram: false,
    discord: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStatus();
  }, []);

  const fetchPlatformStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        withCredentials: true
      });
      setPlatforms(response.data.platforms);
    } catch (error) {
      console.error('Error fetching platform status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = async (platform) => {
    try {
      // Simulate OAuth flow - in real app, this would redirect to OAuth provider
      const token = `mock_token_${platform}_${Date.now()}`;
      await axios.post(`http://localhost:5000/api/platforms/connect/${platform}`, {
        token
      }, {
        withCredentials: true
      });
      
      setPlatforms(prev => ({
        ...prev,
        [platform]: true
      }));
    } catch (error) {
      console.error(`Error connecting ${platform}:`, error);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    try {
      await axios.post(`http://localhost:5000/api/platforms/disconnect/${platform}`, {}, {
        withCredentials: true
      });
      
      setPlatforms(prev => ({
        ...prev,
        [platform]: false
      }));
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
    }
  };

  const getPlatformInfo = (platform) => {
    const platformData = {
      twitch: {
        name: 'Twitch',
        description: 'Conecta tu cuenta de Twitch para programar streams',
        color: 'bg-purple-500',
        icon: Twitch
      },
      twitter: {
        name: 'Twitter/X',
        description: 'Conecta tu cuenta de Twitter para programar tweets',
        color: 'bg-blue-500',
        icon: Twitter
      },
      instagram: {
        name: 'Instagram',
        description: 'Conecta tu cuenta de Instagram para programar posts',
        color: 'bg-pink-500',
        icon: Instagram
      },
      discord: {
        name: 'Discord',
        description: 'Conecta tu servidor de Discord para programar mensajes',
        color: 'bg-indigo-500',
        icon: MessageCircle
      }
    };
    return platformData[platform];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Plataformas Sociales</h2>
            <p className="mt-1 text-sm text-gray-600">
              Conecta tus cuentas sociales para programar contenido automáticamente
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {Object.keys(platforms).map((platform) => {
              const info = getPlatformInfo(platform);
              const Icon = info.icon;
              const isConnected = platforms[platform];
              
              return (
                <div key={platform} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${info.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{info.name}</h3>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {isConnected ? (
                      <>
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          <span className="text-sm font-medium">Conectado</span>
                        </div>
                        <button
                          onClick={() => handleDisconnectPlatform(platform)}
                          className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                        >
                          <Unlink className="w-4 h-4 mr-1" />
                          Desconectar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectPlatform(platform)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Conectar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Settings */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Configuración de Cuenta</h2>
            <p className="mt-1 text-sm text-gray-600">
              Gestiona la configuración de tu cuenta
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Nombre de usuario</h3>
                <p className="text-sm text-gray-600">{user?.username}</p>
              </div>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Cambiar
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Correo electrónico</h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Cambiar
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Contraseña</h3>
                <p className="text-sm text-gray-600">••••••••</p>
              </div>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Cambiar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings; 