import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import BASE_URL from '../config';

const Dashboard = () => {
  const [products, setProducts] = useState({});
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/products`);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'Auction Ended';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
  };

  useEffect(() => {
    fetchProducts();

    const newSocket = io(`${BASE_URL}`, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      setNotifications(prev => [...prev.slice(-4), {
        id: Date.now(),
        type: 'connection',
        message: 'Connected to live updates',
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (err) => {
      setConnectionStatus('error');
      setNotifications(prev => [...prev.slice(-4), {
        id: Date.now(),
        type: 'error',
        message: 'Connection error - updates may be delayed',
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('initial_state', (data) => {
      setProducts(data.products);
    });

    newSocket.on('bid_update', (data) => {
      setProducts(prev => ({
        ...prev,
        [data.product]: {
          ...prev[data.product],
          highest_bid: data.highest_bid,
          bids: data.bids,
          highest_bidder: data.user
        }
      }));
      setNotifications(prev => [...prev.slice(-4), {
        id: Date.now(),
        type: 'bid',
        product: data.product,
        user: data.user,
        amount: data.highest_bid,
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('timer_update', (data) => {
      setProducts(prev => {
        if (!prev[data.product]) return prev;
        return {
          ...prev,
          [data.product]: {
            ...prev[data.product],
            time_remaining: data.time_remaining
          }
        };
      });
    });

    newSocket.on('auction_ended', (data) => {
      setNotifications(prev => [...prev.slice(-4), {
        id: Date.now(),
        type: 'auction_ended',
        product: data.product,
        winner: data.winner,
        amount: data.final_price,
        timestamp: new Date().toISOString()
      }]);
      fetchProducts();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const productArray = Object.entries(products).map(([name, details]) => ({
    name,
    ...details
  }));

  const sortedProducts = [...productArray].sort((a, b) => 
    (a.time_remaining || 0) - (b.time_remaining || 0)
  );

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              Live Auction Dashboard
            </h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
              <span className="text-sm font-medium text-gray-600">
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real-time updates on active auctions. Watch as bids come in!
          </p>
        </header>

        {notifications.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Recent Activity</h2>
            <div className="space-y-2">
              {[...notifications].reverse().map(notification => (
                <div key={notification.id} className="flex items-start p-3 rounded-lg bg-gray-50">
                  <div className={`flex-shrink-0 h-2 w-2 mt-1 rounded-full ${
                    notification.type === 'bid' ? 'bg-blue-500' :
                    notification.type === 'auction_ended' ? 'bg-purple-500' :
                    notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">
                      {notification.type === 'bid' ? (
                        `New bid on ${notification.product}: ₹${notification.amount.toLocaleString()} by ${notification.user}`
                      ) : notification.type === 'auction_ended' ? (
                        `Auction ended for ${notification.product}! Winner: ${notification.winner} (₹${notification.amount.toLocaleString()})`
                      ) : (
                        notification.message
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map(product => {
              const timeRemaining = formatTime(product.time_remaining);
              const isEnded = timeRemaining === 'Auction Ended';
              
              return (
                <div
                  key={product.name}
                  className={`relative overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    isEnded ? 'bg-white' : 'bg-white'
                  } border ${isEnded ? 'border-gray-200' : 'border-blue-200'}`}
                >
                  {!isEnded && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      LIVE
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800 truncate">
                        {product.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isEnded ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {timeRemaining}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-5 line-clamp-2">
                      {product.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Highest Bid</span>
                        <span className="font-bold text-lg text-blue-600">
                          ₹{product.highest_bid?.toLocaleString() || '0'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total Bids</span>
                        <span className="font-medium text-gray-700">
                          {product.bids || '0'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Highest Bidder</span>
                        <span className="font-medium text-blue-500 truncate max-w-[120px]">
                          {product.highest_bidder || 'None yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!isEnded && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-lg shadow-md">
            <div className="mb-6 p-6 bg-gray-100 rounded-full">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              No Active Auctions Right Now
            </h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
