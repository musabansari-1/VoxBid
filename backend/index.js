const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const moment = require('moment');
const axios = require('axios');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Models
const PRODUCTS = {
  "Chessboard": {
    "description": "Handcrafted wooden chessboard with polished walnut finish.",
    "highest_bid": 3500,
    "highest_bidder": "Aarav Sharma",
    "end_time": moment().add(3, 'minutes').toISOString(),
    "history": [2000, 2500, 3100, 3500],
    "bids": 19
  },
  "Vintage Watch": {
    "description": "Classic 1960s Swiss automatic wristwatch in mint condition.",
    "highest_bid": 7600,
    "highest_bidder": "Meera Kapoor",
    "end_time": moment().add(8, 'minutes').toISOString(),
    "history": [5000, 6000, 6800, 7600],
    "bids": 3
  },
  "iPad": {
    "description": "Brand new Apple iPad Pro 11-inch with M2 chip.",
    "highest_bid": 52000,
    "highest_bidder": "Rohan Verma",
    "end_time": moment().add(10, 'minutes').toISOString(),
    "history": [48000, 50000, 51000, 52000],
    "bids": 10
  },
  "PS5": {
    "description": "Sony PlayStation 5 with DualSense Controller and Horizon bundle.",
    "highest_bid": 42000,
    "highest_bidder": "Simran Bhatia",
    "end_time": moment().add(6, 'minutes').toISOString(),
    "history": [39000, 40000, 41000, 42000],
    "bids": 6
  },
  "MacBook Air": {
    "description": "Apple MacBook Air M2 (2023), 256GB SSD, Space Gray.",
    "highest_bid": 92000,
    "highest_bidder": "Nikhil Joshi",
    "end_time": moment().add(12, 'minutes').toISOString(),
    "history": [87000, 89000, 91000, 92000],
    "bids": 25
  },
  "Gaming Chair": {
    "description": "Ergonomic RGB gaming chair with adjustable armrests and lumbar support.",
    "highest_bid": 18000,
    "highest_bidder": "Tanvi Desai",
    "end_time": moment().add(7, 'minutes').toISOString(),
    "history": [15000, 16000, 17000, 18000],
    "bids": 5
  },
  "GoPro Hero 12": {
    "description": "GoPro Hero 12 Black with 5K video, waterproof up to 33ft.",
    "highest_bid": 35000,
    "highest_bidder": "Kabir Malik",
    "end_time": moment().add(9, 'minutes').toISOString(),
    "history": [30000, 32000, 34000, 35000],
    "bids": 2
  },
  "iPhone 14": {
    "description": "Apple iPhone 14, 128GB, Midnight Black, brand new.",
    "highest_bid": 73000,
    "highest_bidder": "Ananya Reddy",
    "end_time": moment().add(15, 'minutes').toISOString(),
    "history": [70000, 71000, 72000, 73000],
    "bids": 20
  },
  "Canon DSLR": {
    "description": "Canon EOS 200D DSLR with dual lens kit (18–55mm + 55–250mm).",
    "highest_bid": 56000,
    "highest_bidder": "Ishaan Mehta",
    "end_time": moment().add(11, 'minutes').toISOString(),
    "history": [50000, 52000, 54000, 56000],
    "bids": 4
  },
  "Xbox Series X": {
    "description": "Microsoft Xbox Series X 1TB Console with Game Pass Ultimate.",
    "highest_bid": 49000,
    "highest_bidder": "Zoya Khan",
    "end_time": moment().add(13, 'minutes').toISOString(),
    "history": [45000, 46000, 47000, 49000],
    "bids": 4
  }
};

const CLOSED_PRODUCTS = {};
const USER_BIDS = {};
const AUTO_BIDS = {}; // Stores auto-bid configurations: { userId: { productName: { maxAmount: number } } }
const USER_BUDGETS = {};

// // Helper Functions
// // Function to handle placing a bid (internal use for both manual and auto-bids)
// const placeBidInternal = (socket, product, amount, user_id, is_auto_bid = false) => {
//   if (PRODUCTS[product]) {
//     const current = PRODUCTS[product].highest_bid;
//     if (amount > current) {
//       PRODUCTS[product].highest_bid = amount;
//       PRODUCTS[product].history.push(amount);
//       PRODUCTS[product].bids += 1;
//       PRODUCTS[product].highest_bidder = user_id;

//       const bid = {
//         product,
//         user_id,
//         amount,
//         time: Date.now(),
//       };

//       if (!USER_BIDS[user_id]) {
//         USER_BIDS[user_id] = [];
//       }
//       USER_BIDS[user_id].push(bid);

//       if(USER_BUDGETS[user_id]){
//         USER_BUDGETS[user_id].spent += amount;
//         }

//       io.emit('bid_update', {
//         product,
//         highest_bid: amount,
//         bids: PRODUCTS[product].bids,
//         user: user_id,
//         is_auto_bid: is_auto_bid, // Indicate if it's an auto-bid
//       });

//       // Emit response to the specific socket if it's a real socket
//       if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//         socket.emit('bid_response', {
//           status: 'success',
//           message: `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed successfully on ${product} for ₹${amount}.`,
//           product,
//           amount,
//           is_auto_bid,
//         });
//       } else {
//         // For dummy sockets (e.g., from intent handlers or timer),
//         // broadcast a general notification or log.
//         io.emit('general_notification', {
//             type: 'bid_status',
//             message: `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed for ${product} by ${user_id} for ₹${amount}.`,
//             product,
//             amount,
//             user: user_id,
//             is_auto_bid,
//         });
//         console.log(`[Dummy Socket Action] ${is_auto_bid ? 'Auto-bid' : 'Bid'} placed for ${product} by ${user_id} for ₹${amount}.`);
//       }
      
//       return true;
//     } else {
//       if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//         socket.emit('bid_response', {
//           status: 'error',
//           message: `Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`,
//           product,
//           amount,
//           is_auto_bid,
//         });
//       } else {
//         io.emit('general_notification', {
//             type: 'bid_status_error',
//             message: `Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`,
//             product,
//             amount,
//             user: user_id,
//             is_auto_bid,
//         });
//         console.log(`[Dummy Socket Action] Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`);
//       } 
//       return false;
//     }
//   } else {
//     if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//       socket.emit('bid_response', {
//         status: 'error',
//         message: 'Product not found or auction ended.',
//         product,
//         amount,
//         is_auto_bid,
//       });
//     } else {
//         io.emit('general_notification', {
//             type: 'bid_status_error',
//             message: `Product ${product} not found or auction ended.`,
//             product,
//             amount,
//             user: user_id,
//             is_auto_bid,
//         });
//         console.log(`[Dummy Socket Action] Product ${product} not found or auction ended.`);
//     }
//     return false;
//   }
// };



// // Improved placeBidInternal function with proper auto-bid accounting
// const placeBidInternal = (socket, product, amount, user_id, is_auto_bid = false) => {
//   if (!PRODUCTS[product]) {
//     const errorMsg = 'Product not found or auction ended.';
//     handleBidError(socket, product, amount, user_id, is_auto_bid, errorMsg);
//     return false;
//   }

//   const current = PRODUCTS[product].highest_bid;
//   if (amount <= current) {
//     const errorMsg = `Bid amount ₹${amount} is too low. Current highest bid: ₹${current}.`;
//     handleBidError(socket, product, amount, user_id, is_auto_bid, errorMsg);
//     return false;
//   }

//   // Process the successful bid
//   PRODUCTS[product].highest_bid = amount;
//   PRODUCTS[product].history.push({
//     amount,
//     user_id,
//     timestamp: new Date().toISOString(),
//     is_auto_bid
//   });
//   PRODUCTS[product].bids += 1;
//   PRODUCTS[product].highest_bidder = user_id;

//   const bid = {
//     product,
//     user_id,
//     amount,
//     time: Date.now(),
//     is_auto_bid
//   };

//   // Initialize user bids if not exists
//   if (!USER_BIDS[user_id]) {
//     USER_BIDS[user_id] = [];
//   }

//   // Handle budget accounting
//   if (USER_BUDGETS[user_id]) {
//     if (is_auto_bid) {
//       // For auto-bids, find and remove any previous auto-bid for this product
//       const previousAutoBidIndex = USER_BIDS[user_id].findIndex(
//         b => b.product === product && b.is_auto_bid
//       );
      
//       if (previousAutoBidIndex !== -1) {
//         USER_BUDGETS[user_id].spent -= USER_BIDS[user_id][previousAutoBidIndex].amount;
//         USER_BIDS[user_id].splice(previousAutoBidIndex, 1);
//       }
//     }
//     USER_BUDGETS[user_id].spent += amount;
//   }

//   USER_BIDS[user_id].push(bid);

//   // Notify all clients
//   io.emit('bid_update', {
//     product,
//     highest_bid: amount,
//     bids: PRODUCTS[product].bids,
//     user: user_id,
//     is_auto_bid
//   });

//   // Send response to the bidder
//   const successMsg = `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed successfully on ${product} for ₹${amount}.`;
//   if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//     socket.emit('bid_response', {
//       status: 'success',
//       message: successMsg,
//       product,
//       amount,
//       is_auto_bid,
//     });
//   } else {
//     io.emit('general_notification', {
//       type: 'bid_status',
//       message: successMsg,
//       product,
//       amount,
//       user: user_id,
//       is_auto_bid,
//     });
//     console.log(`[Dummy Socket Action] ${successMsg}`);
//   }
  
//   return true;
// };

// const placeBidInternal = (socket, product, amount, user_id, is_auto_bid = false) => {
//   if (PRODUCTS[product]) {
//     const current = PRODUCTS[product].highest_bid;
//     if (amount > current) {
//       PRODUCTS[product].highest_bid = amount;
//       PRODUCTS[product].history.push(amount);
//       PRODUCTS[product].bids += 1;
//       PRODUCTS[product].highest_bidder = user_id;

//       const bid = {
//         product,
//         user_id,
//         amount,
//         time: Date.now(),
//       };

//       if (!USER_BIDS[user_id]) {
//         USER_BIDS[user_id] = [];
//       }
//       USER_BIDS[user_id].push(bid);

//       if(USER_BUDGETS[user_id]){
//         USER_BUDGETS[user_id].spent += amount;
//         }

//       io.emit('bid_update', {
//         product,
//         highest_bid: amount,
//         bids: PRODUCTS[product].bids,
//         user: user_id,
//         is_auto_bid: is_auto_bid, // Indicate if it's an auto-bid
//       });

//       // Emit response to the specific socket if it's a real socket
//       if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//         socket.emit('bid_response', {
//           status: 'success',
//           message: `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed successfully on ${product} for ₹${amount}.`,
//           product,
//           amount,
//           is_auto_bid,
//         });
//       } else {
//         // For dummy sockets (e.g., from intent handlers or timer),
//         // broadcast a general notification or log.
//         io.emit('general_notification', {
//             type: 'bid_status',
//             message: `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed for ${product} by ${user_id} for ₹${amount}.`,
//             product,
//             amount,
//             user: user_id,
//             is_auto_bid,
//         });
//         console.log(`[Dummy Socket Action] ${is_auto_bid ? 'Auto-bid' : 'Bid'} placed for ${product} by ${user_id} for ₹${amount}.`);
//       }
      
//       return true;
//     } else {
//       if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//         socket.emit('bid_response', {
//           status: 'error',
//           message: `Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`,
//           product,
//           amount,
//           is_auto_bid,
//         });
//       } else {
//         io.emit('general_notification', {
//             type: 'bid_status_error',
//             message: `Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`,
//             product,
//             amount,
//             user: user_id,
//             is_auto_bid,
//         });
//         console.log(`[Dummy Socket Action] Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`);
//       } 
//       return false;
//     }
//   } else {
//     if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
//       socket.emit('bid_response', {
//         status: 'error',
//         message: 'Product not found or auction ended.',
//         product,
//         amount,
//         is_auto_bid,
//       });
//     } else {
//         io.emit('general_notification', {
//             type: 'bid_status_error',
//             message: `Product ${product} not found or auction ended.`,
//             product,
//             amount,
//             user: user_id,
//             is_auto_bid,
//         });
//         console.log(`[Dummy Socket Action] Product ${product} not found or auction ended.`);
//     }
//     return false;
//   }
// };


const placeBidInternal = (socket, product, amount, user_id, is_auto_bid = false) => {
  if (PRODUCTS[product]) {
    const current = PRODUCTS[product].highest_bid;
    
    // Check if bid amount is valid
    if (amount <= current) {
      const errorMsg = `Bid amount ₹${amount} is too low. Current highest bid is ₹${current}`;
      
      if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
        socket.emit('bid_response', {
          status: 'error',
          message: errorMsg,
          product,
          amount,
          is_auto_bid
        });
      } else {
        io.emit('general_notification', {
          type: 'bid_error',
          message: errorMsg,
          product,
          user: user_id
        });
      }
      return false;
    }

    // Check user budget
    if (USER_BUDGETS[user_id]) {
      const existingBidIndex = USER_BIDS[user_id]?.findIndex(b => b.product === product) ?? -1;
      const existingBidAmount = existingBidIndex !== -1 ? USER_BIDS[user_id][existingBidIndex].amount : 0;
      const netAmount = amount - existingBidAmount;
      
      if (USER_BUDGETS[user_id].totalBudget < (USER_BUDGETS[user_id].spent + netAmount)) {
        const errorMsg = `Insufficient budget. You need ₹${netAmount} more to place this bid`;
        
        if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
          socket.emit('bid_response', {
            status: 'error',
            message: errorMsg,
            product,
            amount,
            is_auto_bid
          });
        } else {
          io.emit('general_notification', {
            type: 'budget_error',
            message: errorMsg,
            user: user_id
          });
        }
        return false;
      }
    }

    // Process the bid
    PRODUCTS[product].highest_bid = amount;
    PRODUCTS[product].highest_bidder = user_id;
    PRODUCTS[product].bids += 1;
    PRODUCTS[product].history.push({
      amount,
      user_id,
      timestamp: new Date().toISOString(),
      is_auto_bid
    });

    // Initialize user bids if needed
    if (!USER_BIDS[user_id]) {
      USER_BIDS[user_id] = [];
    }

    // Handle existing bid replacement
    const existingBidIndex = USER_BIDS[user_id].findIndex(b => b.product === product);
    if (existingBidIndex !== -1) {
      if (USER_BUDGETS[user_id]) {
        USER_BUDGETS[user_id].spent -= USER_BIDS[user_id][existingBidIndex].amount;
      }
      USER_BIDS[user_id].splice(existingBidIndex, 1);
    }

    // Record new bid
    USER_BIDS[user_id].push({
      product,
      user_id,
      amount,
      time: Date.now(),
      is_auto_bid
    });

    // Update budget
    if (USER_BUDGETS[user_id]) {
      USER_BUDGETS[user_id].spent += amount;
    }

    // Notify all clients
    io.emit('bid_update', {
      product,
      highest_bid: amount,
      bids: PRODUCTS[product].bids,
      user: user_id,
      is_auto_bid
    });

    // Send success response
    const successMsg = `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed successfully on ${product} for ₹${amount}`;
    if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
      socket.emit('bid_response', {
        status: 'success',
        message: successMsg,
        product,
        amount,
        is_auto_bid,
        budget: USER_BUDGETS[user_id] ? {
          total: USER_BUDGETS[user_id].totalBudget,
          spent: USER_BUDGETS[user_id].spent,
          remaining: USER_BUDGETS[user_id].totalBudget - USER_BUDGETS[user_id].spent
        } : undefined
      });
    } else {
      io.emit('general_notification', {
        type: 'bid_success',
        message: successMsg,
        product,
        user: user_id,
        amount
      });
    }

    return true;
  } else {
    // Product not found
    const errorMsg = `Auction for ${product} not found or has ended`;
    if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
      socket.emit('bid_response', {
        status: 'error',
        message: errorMsg,
        product,
        amount,
        is_auto_bid
      });
    } else {
      io.emit('general_notification', {
        type: 'auction_error',
        message: errorMsg,
        product
      });
    }
    return false;
  }
};

function getTimeRemaining(endTimeStr) {
  const endTime = moment(endTimeStr);
  const remaining = endTime.diff(moment(), 'seconds');
  if (remaining <= 0) return "Ended";
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}m ${seconds}s`;
}

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send initial auction state
  socket.emit('auction_state', {
    products: PRODUCTS,
    closed_products: CLOSED_PRODUCTS
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('place_bid', (data) => {
    const product = data.productName;
    const amount = parseFloat(data.bidAmount);
    const user_id = data.user;
    // Direct socket available here
    placeBidInternal(socket, product, amount, user_id);
  });
});

// Auction Timer
// In your Express server code (where you have the auction timer)
setInterval(() => {
    const now = moment();
    for (const [name, item] of Object.entries(PRODUCTS)) {
      const endTime = moment(item.end_time);
      const timeRemaining = endTime.diff(now, 'seconds');
      
      // Broadcast time remaining for each product
      io.emit('timer_update', {
        product: name,
        time_remaining: timeRemaining > 0 ? timeRemaining : 0
      });
  
      if (now.isSameOrAfter(endTime)) {
        CLOSED_PRODUCTS[name] = { ...PRODUCTS[name] };
        delete PRODUCTS[name];

        // Remove any auto-bids for this product once auction ends
        for (const userId in AUTO_BIDS) {
          if (AUTO_BIDS[userId][name]) {
            delete AUTO_BIDS[userId][name];
            // For timer-triggered events, directly emitting to specific user is hard without user-socket mapping.
            // Rely on general notifications for now.
            io.emit('general_notification', { type: 'auto_bid_status', message: `Your auto-bid for ${name} has ended as the auction is over.`, product: name, user: userId });
          }
        }

        io.emit('auction_ended', {
          product: name,
          winner: item.highest_bidder,
          final_price: item.highest_bid
        });
      }
    }

    // Check for outbid auto-bids and place new bids
    for (const userId in AUTO_BIDS) {
      for (const productName in AUTO_BIDS[userId]) {
        const autoBidConfig = AUTO_BIDS[userId][productName];
        const productData = PRODUCTS[productName];

        if (productData && productData.highest_bidder !== userId) {
          // User is outbid, attempt to place a new bid
          if (productData.highest_bid < autoBidConfig.max_amount) {
            const nextBidAmount = productData.highest_bid + 1; // Or some increment logic
            if (nextBidAmount <= autoBidConfig.max_amount) {
              // Create a dummy socket for placeBidInternal for timer calls
              const dummySocketForTimer = { is_dummy: true, emit: (event, data) => console.log(`[Timer Dummy Socket] Emitting ${event}:`, data) };
              placeBidInternal(dummySocketForTimer, productName, nextBidAmount, userId, true);
            }
          }
        }
      }
    }

  }, 1000); // Update every second for smooth countdown

// Intent Handlers
const handleListAvailableProducts = (data) => ({
  products: Object.keys(PRODUCTS)
});


const handleProductRecommendationIntent = (data) => {
  const criteria = data.criteria || 'most_competitive'; // Default to most competitive
  const now = moment();
  
  // Prepare all products with their metrics
  const productsWithMetrics = Object.entries(PRODUCTS).map(([name, item]) => {
    const endTime = moment(item.end_time);
    const timeRemaining = endTime.diff(now, 'seconds');
    const minsRemaining = timeRemaining / 60;
    
    // Calculate competitiveness score (similar to ProductCompetitivenessIntent)
    const recentBids = item.history.filter(bid => 
      moment(bid.timestamp || item.end_time).isAfter(moment().subtract(15, 'minutes'))
    ).length;
    const bidsPerMinute = recentBids / 15;
    const priceIncrease = item.highest_bid - (item.history[0] || item.highest_bid);
    const percentIncrease = (priceIncrease / item.history[0]) * 100 || 0;
    const uniqueBidders = new Set(item.history.map(b => b.user_id)).size;
    const isFinalPhase = minsRemaining < 5;
    
    const competitivenessScore = Math.min(100, Math.round(
      (bidsPerMinute * 10) +
      (percentIncrease * 0.5) +
      (uniqueBidders * 3) +
      (isFinalPhase ? 30 : 0)
    ));
    
    return {
      name,
      description: item.description,
      highest_bid: item.highest_bid,
      highest_bidder: item.highest_bidder,
      bids: item.bids,
      time_remaining: timeRemaining,
      mins_remaining: minsRemaining,
      competitiveness: competitivenessScore,
      recent_bids: recentBids,
      price_increase: priceIncrease
    };
  });

  // Sort based on requested criteria
  let sortedProducts = [];
  let recommendationReason = "";
  
  switch(criteria) {
    case 'most_competitive':
      sortedProducts = productsWithMetrics.sort((a, b) => b.competitiveness - a.competitiveness);
      recommendationReason = "These products have the highest bidding activity and competition";
      break;
      
    case 'least_competitive':
      sortedProducts = productsWithMetrics.sort((a, b) => a.competitiveness - b.competitiveness);
      recommendationReason = "These products have the least bidding activity, potentially good deals";
      break;
      
    case 'ending_soonest':
      sortedProducts = productsWithMetrics.sort((a, b) => a.time_remaining - b.time_remaining);
      recommendationReason = "These auctions are ending soonest - act fast!";
      break;
      
    case 'most_time_remaining':
      sortedProducts = productsWithMetrics.sort((a, b) => b.time_remaining - a.time_remaining);
      recommendationReason = "These auctions have the most time remaining - you can take your time";
      break;
      
    case 'highest_amount':
      sortedProducts = productsWithMetrics.sort((a, b) => b.highest_bid - a.highest_bid);
      recommendationReason = "These are the most expensive items currently";
      break;
      
    case 'lowest_amount':
      sortedProducts = productsWithMetrics.sort((a, b) => a.highest_bid - b.highest_bid);
      recommendationReason = "These are the least expensive items currently";
      break;
      
    case 'most_bids':
      sortedProducts = productsWithMetrics.sort((a, b) => b.bids - a.bids);
      recommendationReason = "These items have received the most bids";
      break;
      
    case 'least_bids':
      sortedProducts = productsWithMetrics.sort((a, b) => a.bids - b.bids);
      recommendationReason = "These items have received the fewest bids";
      break;
      
    default:
      sortedProducts = productsWithMetrics.sort((a, b) => b.competitiveness - a.competitiveness);
      recommendationReason = "Here are some product recommendations";
  }

  // Format the response
  const recommendations = sortedProducts.slice(0, 3).map(product => ({
    product: product.name,
    description: product.description,
    current_bid: product.highest_bid,
    time_remaining: product.time_remaining > 0 
      ? `${Math.floor(product.mins_remaining)}m ${Math.round(product.time_remaining % 60)}s`
      : "Ended",
    competitiveness: product.competitiveness,
    competitiveness_level: product.competitiveness > 75 ? "Very High" :
                          product.competitiveness > 50 ? "High" :
                          product.competitiveness > 25 ? "Moderate" : "Low",
    recent_bids: product.recent_bids,
    price_increase: product.price_increase
  }));

  return {
    status: "success",
    criteria_requested: criteria,
    recommendation_reason: recommendationReason,
    recommendations,
    all_metrics: criteria === 'show_all' ? productsWithMetrics : undefined
  };
};




// const handleUserNotifications = (data) => {
//   // Debugging setup
//   const testNotifications = [{
//     type: "debug_test",
//     product: "TEST_ITEM",
//     message: "Notification system is active",
//     timestamp: new Date().toISOString()
//   }];

//   if (!data || !data.user) {
//     return { notifications: testNotifications };
//   }

//   const user_id = data.user;
//   const notifications = [...testNotifications];
//   const now = moment();

//   for (const bid of USER_BIDS[user_id] || []) {
//     const product = bid.product;
//     const user_bid = bid.amount;
//     console.log('product',product);
//     console.log('amount', user_bid);
//   }

//   // 1. Check active auctions for outbids and ending soon
//   for (const bid of USER_BIDS[user_id] || []) {
//     const product = bid.product;
//     const user_bid = bid.amount;

//     if (PRODUCTS[product]) {
//       const product_data = PRODUCTS[product];
      
//       // Outbid check
//       if (product_data.highest_bid > user_bid && product_data.highest_bidder !== user_id) {
//         notifications.push({
//           type: "outbid",
//           product,
//           message: `You've been outbid on ${product}. Current bid: ₹${product_data.highest_bid}`,
//           timestamp: now.toISOString()
//         });
//       }

//       // Ending soon check
//       const secondsRemaining = moment(product_data.end_time).diff(now, 'seconds');
//       if (secondsRemaining > 0 && secondsRemaining <= 120) {
//         const mins = Math.floor(secondsRemaining / 60);
//         const secs = secondsRemaining % 60;
//         notifications.push({
//           type: "ending_soon",
//           product,
//           message: `${product} ending in ${mins}m ${secs}s! Current bid: ₹${product_data.highest_bid}`,
//           timestamp: now.toISOString()
//         });
//       }
//     }
//   }

//   // 2. Check closed auctions for wins
//   for (const [product, product_data] of Object.entries(CLOSED_PRODUCTS)) {
//     const user_has_bid = USER_BIDS[user_id]?.some(bid => bid.product === product);
//     if (user_has_bid && product_data.highest_bidder === user_id) {
//       notifications.push({
//         type: "won",
//         product,
//         message: `You won ${product} for ₹${product_data.highest_bid}!`,
//         timestamp: product_data.end_time
//       });
//     }
//   }

//   // 3. Check if any auctions just ended (real-time)
//   for (const [product, product_data] of Object.entries(PRODUCTS)) {
//     if (moment(product_data.end_time).isSameOrAfter(now.subtract(5, 'seconds'))) {
//       if (product_data.highest_bidder === user_id) {
//         notifications.push({
//           type: "won",
//           product,
//           message: `You just won ${product} for ₹${product_data.highest_bid}!`,
//           timestamp: now.toISOString()
//         });
//       }
//     }
//   }

//   return { notifications: notifications.length > 1 ? notifications : testNotifications };
// };


// const handleUserNotifications = (data) => {
//   // Debugging setup
//   const testNotifications = [{
//     type: "debug_test",
//     product: "TEST_ITEM",
//     message: "Notification system is active",
//     timestamp: new Date().toISOString()
//   }];

//   if (!data || !data.user) {
//     return { notifications: testNotifications };
//   }

//   const user_id = data.user;
//   console.log('here', user_id);
//   const notifications = [...testNotifications];
//   const now = moment();

//   console.log(USER_BIDS[user_id])

//   // 1. Check active auctions for outbids and ending soon
//   for (const bid of USER_BIDS[user_id] || []) {
//     const product = bid.product;
//     const user_bid = bid.amount;
//     console.log(product);
//     console.log(user_bid);

//     if (PRODUCTS[product]) {
//       const product_data = PRODUCTS[product];
      
//       // Outbid check
//       if (product_data.highest_bid > user_bid && product_data.highest_bidder !== user_id) {
//         notifications.push({
//           type: "outbid",
//           product,
//           message: `You've been outbid on ${product}. Current bid: ₹${product_data.highest_bid}`,
//           timestamp: now.toISOString()
//         });
//       }

//       // Ending soon check
//       const secondsRemaining = moment(product_data.end_time).diff(now, 'seconds');
//       if (secondsRemaining > 0 && secondsRemaining <= 120) {
//         const mins = Math.floor(secondsRemaining / 60);
//         const secs = secondsRemaining % 60;
//         notifications.push({
//           type: "ending_soon",
//           product,
//           message: `${product} ending in ${mins}m ${secs}s! Current bid: ₹${product_data.highest_bid}`,
//           timestamp: now.toISOString()
//         });
//       }
//     }
//   }

//   // 2. Check closed auctions for wins
//   for (const [product, product_data] of Object.entries(CLOSED_PRODUCTS)) {
//     const user_has_bid = USER_BIDS[user_id]?.some(bid => bid.product === product);
//     if (user_has_bid && product_data.highest_bidder === user_id) {
//       notifications.push({
//         type: "won",
//         product,
//         message: `You won ${product} for ₹${product_data.highest_bid}!`,
//         timestamp: product_data.end_time
//       });
//     }
//   }

//   // 3. Check if any auctions just ended (real-time)
//   for (const [product, product_data] of Object.entries(PRODUCTS)) {
//     // Check if auction ended in the last 5 seconds
//     if (moment(product_data.end_time).isBetween(now.clone().subtract(5, 'seconds'), now)) {
//       if (product_data.highest_bidder === user_id) {
//         notifications.push({
//           type: "won",
//           product,
//           message: `You just won ${product} for ₹${product_data.highest_bid}!`,
//           timestamp: now.toISOString()
//         });
//       }
//     }
//   }

//   // Return all notifications (including test one if no others exist)
//   return { notifications };
// };


const handleUserNotifications = (data) => {
  // Debugging setup
  const testNotifications = [{
    type: "debug_test",
    product: "TEST_ITEM",
    message: "Notification system is active",
    timestamp: new Date().toISOString()
  }];

  if (!data || !data.user) {
    return { notifications: testNotifications };
  }

  const user_id = data.user;
  const notifications = [];
  const now = moment();
  console.log('now',now);

  



  // 1. Check active auctions for outbids and ending soon
  for (const bid of USER_BIDS[user_id] || []) {
    const product = bid.product;
    const user_bid = bid.amount;



    if (PRODUCTS[product]) {
      const product_data = PRODUCTS[product];
      
      // Outbid check
      if (product_data.highest_bid > user_bid && product_data.highest_bidder !== user_id) {
        notifications.push({
          type: "outbid",
          product,
          message: `You've been outbid on ${product}. Current bid: ₹${product_data.highest_bid}`,
          timestamp: now.toISOString()
        });
      }

      // Ending soon check - improved logic
      const endTime = moment(product_data.end_time);
      console.log('endTime', endTime);
      const secondsRemaining = endTime.diff(now, 'seconds');
      console.log('seconds Remaining', secondsRemaining);
      
      // Only notify if there's positive time remaining (auction hasn't ended)
      if (secondsRemaining > 0) {
        // Notify when less than 2 minutes remain
        if (secondsRemaining <= 120) {
          const mins = Math.floor(secondsRemaining / 60);
          const secs = secondsRemaining % 60;
          const timeStr = `${mins}m ${secs}s`;
          
          notifications.push({
            type: "ending_soon",
            product,
            message: `${product} ending in ${timeStr}! Current bid: ₹${product_data.highest_bid}`,
            timestamp: now.toISOString(),
            time_remaining: timeStr
          });
        }
        
        // Additional notification when less than 30 seconds remain
        if (secondsRemaining <= 30) {
          notifications.push({
            type: "ending_very_soon",
            product,
            message: `${product} ending in ${secondsRemaining} seconds! Last chance to bid!`,
            timestamp: now.toISOString(),
            time_remaining: `${secondsRemaining}s`
          });
        }
      }
    }
  }

  // 2. Check closed auctions for wins
  for (const [product, product_data] of Object.entries(CLOSED_PRODUCTS)) {
    const user_has_bid = USER_BIDS[user_id]?.some(bid => bid.product === product);
    if (user_has_bid && product_data.highest_bidder === user_id) {
      notifications.push({
        type: "won",
        product,
        message: `You won ${product} for ₹${product_data.highest_bid}!`,
        timestamp: product_data.end_time
      });
    }
  }

  // 3. Check if any auctions just ended (real-time)
  const recentlyEnded = Object.entries(PRODUCTS).filter(([product, product_data]) => {
    const endTime = moment(product_data.end_time);
    return endTime.isBetween(now.clone().subtract(5, 'seconds'), now);
  });

  for (const [product, product_data] of recentlyEnded) {
    if (product_data.highest_bidder === user_id) {
      notifications.push({
        type: "won",
        product,
        message: `You just won ${product} for ₹${product_data.highest_bid}!`,
        timestamp: now.toISOString()
      });
    }
  }

  const endingSoonProducts = [];
  for(const key in PRODUCTS){
    const product = PRODUCTS[key];
    const product_name = key;
    
    const endTime = moment(product.end_time);
    const secondsRemaining = endTime.diff(now, 'seconds');
    if(secondsRemaining > 0 && secondsRemaining < 120){
      endingSoonProducts.push(product_name);
    }  
  }
  console.log(`These products are ending soon: ${endingSoonProducts.join(', ')}`)
  if(endingSoonProducts.length > 0){
    notifications.push({
      type: "productEndingSoon",
      message: `These auction items are ending soon: ${endingSoonProducts.join(', ')}`,
      timestamp: now.toISOString()
    });
  }
 

  return { notifications: notifications.length > 0 ? notifications : testNotifications };
};

const handleAskProduct = (data) => {
  const product = data.productName;
  if (product in PRODUCTS) {
    const item = PRODUCTS[product];
    return {
      product,
      description: item.description,
      highest_bid: item.highest_bid,
      time_remaining: getTimeRemaining(item.end_time)
    };
  }
  return { error: "Product not found" };
};

// const handlePlaceBid = (data) => {
//   const product = data.productName;
//   const amount = parseFloat(data.bidAmount);
//   const user_id = data.user;

//   const dummySocketForIntent = { is_dummy: true, emit: (event, data) => console.log(`[Intent Handler Dummy Socket] Emitting ${event}:`, data) };
//   const bidPlaced = placeBidInternal(dummySocketForIntent, product, amount, user_id, false);

//   if (bidPlaced) {
//     return { status: "bid_placed", product: product, amount: amount, user: user_id };
//   } else {
//     // If bid wasn't placed, it means it was too low or product not found/ended
//     // placeBidInternal already emits specific error messages, so we just return a generic failure for the intent.
//     return { status: "bid_failed", product: product, amount: amount, user: user_id };
//   }
// };

const handlePlaceBid = (data) => {
  const product = data.productName;
  const amount = parseFloat(data.bidAmount);
  const user_id = data.user;

  const dummySocketForIntent = { 
    is_dummy: true, 
    emit: (event, data) => console.log(`[Intent Handler Dummy Socket] Emitting ${event}:`, data) 
  };

  // First check if product exists
  if (!PRODUCTS[product]) {
    return { 
      status: "bid_failed",
      reason: "product_not_found",
      message: `Auction for ${product} not found or has ended`,
      product: product,
      amount: amount,
      user: user_id
    };
  }

  // Then check if bid amount is sufficient
  const currentBid = PRODUCTS[product].highest_bid;
  if (amount <= currentBid) {
    return {
      status: "bid_failed",
      reason: "bid_too_low",
      message: `Your bid of ₹${amount} is too low. Current highest bid is ₹${currentBid}`,
      product: product,
      amount: amount,
      user: user_id,
      minimum_required_bid: currentBid + 1
    };
  }

  // Try to place the bid
  const bidPlaced = placeBidInternal(dummySocketForIntent, product, amount, user_id, false);

  if (bidPlaced) {
    return { 
      status: "bid_placed", 
      product: product, 
      amount: amount, 
      user: user_id,
      message: `Successfully placed bid of ₹${amount} on ${product}`
    };
  } else {
    // Fallback error (should theoretically never reach here)
    return { 
      status: "bid_failed", 
      reason: "unknown_error",
      message: "Unable to place bid due to unknown error",
      product: product,
      amount: amount,
      user: user_id
    };
  }
};

const handleAutoBid = (data) => {
  const product = data.productName;
  const max_amount = data.maxAutoBidAmount;
  const user_id = data.user;

//   if (!user_id || !product || isNaN(max_amount) || max_amount <= 0) {
//     return { status: 'error', message: 'Invalid auto-bid parameters.' };
//   }
  console.log(product);
  console.log(PRODUCTS[product]);

  if (!PRODUCTS[product]) {
    return { status: 'error', message: `Product ${product} not found or auction ended.` };
  }

  if (!AUTO_BIDS[user_id]) {
    AUTO_BIDS[user_id] = {};
  }
  AUTO_BIDS[user_id][product] = { max_amount };

  const dummySocketForIntent = { is_dummy: true, emit: (event, data) => console.log(`[Intent Handler Dummy Socket - AutoBid] Emitting ${event}:`, data) };

  let initialBidPlaced = false;
  // Attempt to place an initial bid if current highest is below max_amount
  if (PRODUCTS[product].highest_bidder !== user_id && PRODUCTS[product].highest_bid < max_amount) {
    const nextBidAmount = PRODUCTS[product].highest_bid + 1; // Simple increment
    if (nextBidAmount <= max_amount) {
      initialBidPlaced = placeBidInternal(dummySocketForIntent, product, nextBidAmount, user_id, true);
    }
  } else if (PRODUCTS[product].highest_bidder === user_id) {
      return { status: 'success', message: `Auto-bid set for ${product} up to ₹${data.maxAutoBidAmount}. You are currently the highest bidder.`, product: product, max_amount: data.maxBidAmount, user: user_id };
  }
  else{
    return { status: 'error', message: `Maximum bid amount is less than current highest bid`, product: product, max_amount: data.maxBidAmount, user: user_id };
  }

  return {
    status: 'success',
    message: `Auto-bid set for ${product} up to ${data.maxAutoBidAmount}. ${initialBidPlaced ? 'An initial bid was placed.' : ''}`,
    product: product,
    max_amount: max_amount,
    user: user_id
  };
};


const handleProductCompetitiveness = (data) => {
  const { productName } = data;
  const product = PRODUCTS[productName];
  
  if (!product) {
    return { 
      status: "error", 
      message: "Product not found or auction ended" 
    };
  }

  // 1. Calculate bidding velocity (bids per minute)
  const biddingWindow = 15; // Analyze last 15 minutes
  const recentBids = product.history.filter(bid => {
    const bidTime = moment(bid.timestamp || product.end_time);
    return moment().diff(bidTime, 'minutes') <= biddingWindow;
  }).length;
  
  const bidsPerMinute = recentBids / biddingWindow;

  // 2. Price increase analysis
  const priceIncrease = product.highest_bid - (product.history[0] || product.highest_bid);
  const percentIncrease = (priceIncrease / product.history[0]) * 100 || 0;

  // 3. Bidder participation
  const uniqueBidders = new Set(product.history.map(b => b.user_id)).size;

  // 4. Time remaining analysis
  const minsRemaining = moment(product.end_time).diff(moment(), 'minutes');
  const isFinalPhase = minsRemaining < 5;

  // Competitive scoring (0-100)
  const competitivenessScore = Math.min(100, Math.round(
    (bidsPerMinute * 10) + // Weight bidding velocity
    (percentIncrease * 0.5) + // Weight price jump
    (uniqueBidders * 3) + // Weight competition
    (isFinalPhase ? 30 : 0) // Final phase boost
  ));

  // Recommendation logic
  let recommendation;
  if (competitivenessScore > 75) {
    recommendation = {
      action: "WAIT",
      reason: "Extremely competitive - prices are rising rapidly",
      optimal_time: "Last 2 minutes",
      risk: "High chance of bidding war"
    };
  } else if (competitivenessScore > 50) {
    recommendation = {
      action: "SET_AUTO_BID",
      reason: "Moderately competitive - set a reasonable max bid",
      optimal_time: "Within next few minutes",
      risk: "May get outbid but good value possible"
    };
  } else {
    recommendation = {
      action: "BID_NOW",
      reason: "Low competition - good opportunity to set early lead",
      optimal_time: "Immediately",
      risk: "May attract more bidders later"
    };
  }

  return {
    status: "success",
    product: productName,
    time_remaining: getTimeRemaining(product.end_time),
    competitiveness: {
      score: competitivenessScore,
      level: competitivenessScore > 75 ? "Very High" :
             competitivenessScore > 50 ? "High" :
             competitivenessScore > 25 ? "Moderate" : "Low",
      indicators: {
        bids_last_15min: recentBids,
        bids_per_minute: bidsPerMinute.toFixed(1),
        price_increase: `${priceIncrease} (${percentIncrease.toFixed(1)}%)`,
        unique_bidders: uniqueBidders,
        final_phase: isFinalPhase ? "Yes" : "No"
      }
    },
    recommendation,
    watchlist_trigger: competitivenessScore > 60 
      ? "This item has been added to your watchlist for updates"
      : undefined
  };
};

const handleGetStats = (data) => {
  const product = data.productName;
  if (product in PRODUCTS) {
    return {
      product,
      bids: PRODUCTS[product].bids,
      highest: PRODUCTS[product].highest_bid
    };
  }
  return { error: "Product not found" };
};

const handleGetBiddingHistory = (data) => {
  const product = data.productName;
  if (product in PRODUCTS) {
    return {
      product,
      history: PRODUCTS[product].history
    };
  }
  return { error: "Product not found" };
};



const initializeUserBudget = (userId, amount) => {
  console.log('amount', amount);
  if (!USER_BUDGETS[userId]) {
    USER_BUDGETS[userId] = {
      totalBudget: amount,
      spent: 0,
    };

    console.log('budget', USER_BUDGETS[userId])
  }
  return USER_BUDGETS[userId];
};

const handleSetBudgetIntent = (data) => {
  const { user, amount } = data;
  
  if (!user) {
    return { 
      status: 'error', 
      message: 'Invalid parameters. Need user ID and valid amount.' 
    };
  }

  const budget = initializeUserBudget(user, amount);
  
  return {
    status: 'success',
    message: `Budget set to${amount} for ${user}`,
    budget
  };
};

const handleBudgetDetailsIntent = (data) => {
  const { user } = data;
  
  if (!user) return { status: 'error', message: 'User ID required' };

  const budget = USER_BUDGETS[user] || initializeUserBudget(user);

  console.log('budget', budget);
  
  return {
    status: USER_BUDGETS[user] ? 'success' : 'not_set',
    budget,
    message: USER_BUDGETS[user] 
      ? `Current budget: ${budget.totalBudget} | Spent: ${budget.spent} | Remaining: ${budget.totalBudget - budget.spent}`
      : 'No budget set for this user'
  };
};


  
 
const handleHaveIBeenOutbid = (data) => {
  const user_id = data.user;
  const outbid_products = [];
  
  if (!USER_BIDS[user_id] || USER_BIDS[user_id].length === 0) {
    return { 
      status: "no_bids", 
      message: "You haven't placed any bids yet." 
    };
  }
  
  for (const bid of USER_BIDS[user_id]) {
    const product_name = bid.product;
    const user_bid_amount = bid.amount;
    
    if (product_name in PRODUCTS) {
      const current_highest_bid = PRODUCTS[product_name].highest_bid;
      const current_highest_bidder = PRODUCTS[product_name].highest_bidder;
      
      if (current_highest_bid > user_bid_amount || current_highest_bidder !== user_id) {
        outbid_products.push({
          product: product_name,
          your_bid: user_bid_amount,
          current_highest_bid: current_highest_bid,
          current_leader: current_highest_bidder,
          time_remaining: getTimeRemaining(PRODUCTS[product_name].end_time)
        });
      }
    }
  }
  
  if (outbid_products.length > 0) {
    return {
      status: "outbid_on_some",
      outbid_products,
      count: outbid_products.length
    };
  } else {
    return {
      status: "not_outbid",
      message: "You're currently the highest bidder on all your active bids!"
    };
  }
};

const handleAuctionAtmosphere = (data) => {
  // Calculate overall activity level
  const totalLiveBids = Object.values(PRODUCTS).reduce((sum, p) => sum + p.bids, 0);
  const recentBids = Object.values(PRODUCTS).reduce((sum, p) => {
    return sum + p.history.filter(bid => 
      moment(bid.timestamp || new Date()).isAfter(moment().subtract(5, 'minutes'))
    ).length;
  }, 0);

  // Identify most active auctions
  const hotAuctions = Object.entries(PRODUCTS)
    .map(([name, data]) => ({
      product: name,
      bid_activity: data.history.filter(bid => 
        moment(bid.timestamp || new Date()).isAfter(moment().subtract(5, 'minutes')))
      .length
    }))
    .sort((a, b) => b.bid_activity - a.bid_activity)
    .slice(0, 3);

  // Determine atmosphere
  let atmosphere;
  if (recentBids > 15) atmosphere = "Highly Competitive";
  else if (recentBids > 8) atmosphere = "Active";
  else atmosphere = "Calm";

  return {
    status: "success",
    atmosphere: {
      level: atmosphere,
      bids_last_5_min: recentBids,
      total_live_bids: totalLiveBids,
      hottest_items: hotAuctions,
      recommended_action: atmosphere === "Highly Competitive" 
        ? "Focus on 1-2 items to avoid overbidding" 
        : "Good opportunity to bid on multiple items"
    }
  };
};

const handleGetMyBidStatus = (data) => {
  const user_id = data.user;
  const product_filter = data.productName || null;
  
  if (!user_id) {
    return { 
      status: "error", 
      message: "User ID is required" 
    };
  }

  const userBids = USER_BIDS[user_id] || [];
  console.log('userBids', userBids);
  const results = {
    won: [],
    lost: [],
    leading: [],
    outbid: [],
    active: []
  };

  // Check closed products first
  for (const [product_name, product_data] of Object.entries(CLOSED_PRODUCTS)) {
    if (product_filter && product_name !== product_filter) continue;
    
    const user_participated = userBids.some(bid => bid.product === product_name);
    if (!user_participated) continue;

    const user_won = (product_data.highest_bidder === user_id);
    const user_max_bid = Math.max(...userBids
      .filter(bid => bid.product === product_name)
      .map(bid => bid.amount)
    );

    if (user_won) {
      results.won.push({
        product: product_name,
        final_price: product_data.highest_bid,
        your_max_bid: user_max_bid,
        closed_at: product_data.end_time
      });
    } else {
      results.lost.push({
        product: product_name,
        winner: product_data.highest_bidder,
        winning_bid: product_data.highest_bid,
        your_max_bid: user_max_bid,
        closed_at: product_data.end_time
      });
    }
  }

  // Check live products
  for (const [product_name, product_data] of Object.entries(PRODUCTS)) {
    if (product_filter && product_name !== product_filter) continue;
    
    const user_participated = userBids.some(bid => bid.product === product_name);
    if (!user_participated) continue;

    const user_max_bid = Math.max(...userBids
      .filter(bid => bid.product === product_name)
      .map(bid => bid.amount)
    );

    if (product_data.highest_bidder === user_id) {
      results.leading.push({
        product: product_name,
        current_bid: product_data.highest_bid,
        your_max_bid: user_max_bid,
        time_remaining: getTimeRemaining(product_data.end_time),
        bids_so_far: product_data.bids
      });
    } else if (product_data.highest_bid > user_max_bid) {
      results.outbid.push({
        product: product_name,
        current_leader: product_data.highest_bidder,
        current_bid: product_data.highest_bid,
        your_max_bid: user_max_bid,
        time_remaining: getTimeRemaining(product_data.end_time)
      });
    } else {
      // User has bids but neither leading nor outbid (possible in some auction logic)
      results.active.push({
        product: product_name,
        status: "active",
        current_bid: product_data.highest_bid,
        your_max_bid: user_max_bid,
        time_remaining: getTimeRemaining(product_data.end_time)
      });
    }
  }

  // Generate summary statistics
  const summary = {
    total_won: results.won.length,
    total_lost: results.lost.length,
    currently_leading: results.leading.length,
    currently_outbid: results.outbid.length,
    active_participations: results.active.length,
    win_rate: results.won.length + results.lost.length > 0 
      ? `${(results.won.length / (results.won.length + results.lost.length) * 100).toFixed(1)}%` 
      : "0%"
  };

  return { 
    status: "success",
    summary,
    details: results,
    message: product_filter 
      ? `Status for ${product_filter}` 
      : "Your complete bidding status across all auctions"
  };
};

const handleGetReceipt = (data) => {
  return { 
    status: "receipt_sent", 
    email: data.email 
  };
};

const handleGetAllMyBids = (data) => {
  const user_id = data.user;
  if (USER_BIDS[user_id]) {
    console.log('user bids', USER_BIDS[user_id])
    return USER_BIDS[user_id];
  }
  return {
    status: "no_bids_found",
    user_id,
    message: "No bids found for this user"
  };
};

const handleGetAuctionHistory = (data) => {
  const user_id = data.user || null;
  
  const history = [];
  for (const [product_name, product_data] of Object.entries(CLOSED_PRODUCTS)) {
    const auction_info = {
      product: product_name,
      description: product_data.description,
      final_price: product_data.highest_bid,
      winner: product_data.highest_bidder,
      winner_bid: product_data.highest_bid,
      total_bids: product_data.bids,
      closed_at: product_data.end_time,
      bidding_history: product_data.history
    };
    
    if (user_id) {
      const user_participated = USER_BIDS[user_id]?.some(
        bid => bid.product === product_name
      );
      
      const user_won = (product_data.highest_bidder === user_id);
      
      const user_bids = USER_BIDS[user_id]?.filter(
        bid => bid.product === product_name
      ).map(bid => bid.amount) || [];
      
      const user_max_bid = user_bids.length > 0 ? Math.max(...user_bids) : null;
      
      Object.assign(auction_info, {
        user_participated,
        user_won,
        user_max_bid,
        user_bid_count: user_bids.length
      });
    }
    
    history.push(auction_info);
  }
  
  history.sort((a, b) => 
    new Date(b.closed_at) - new Date(a.closed_at)
  );
  
  const stats = {
    total_auctions: history.length,
    total_bids_across_all: history.reduce((sum, item) => sum + item.total_bids, 0),
    average_bids_per_auction: history.length > 0 
      ? history.reduce((sum, item) => sum + item.total_bids, 0) / history.length 
      : 0,
    highest_winning_bid: history.length > 0
      ? Math.max(...history.map(item => item.final_price))
      : 0,
    lowest_winning_bid: history.length > 0
      ? Math.min(...history.map(item => item.final_price))
      : 0
  };
  
  if (user_id) {
    const user_wins = history.filter(item => item.user_won).length;
    const user_participations = history.filter(item => item.user_participated).length;
    const user_total_bids = history
      .filter(item => item.user_participated)
      .reduce((sum, item) => sum + item.user_bid_count, 0);
    
    Object.assign(stats, {
      user_stats: {
        total_participated: user_participations,
        total_won: user_wins,
        total_bids_placed: user_total_bids,
        win_rate: user_participations > 0 
          ? `${(user_wins / user_participations * 100).toFixed(1)}%` 
          : "0%",
        average_bids_per_participation: user_participations > 0
          ? user_total_bids / user_participations
          : 0,
        total_amount_bid: history
          .filter(item => item.user_participated)
          .reduce((sum, item) => sum + item.user_max_bid, 0)
      }
    });
  }
  
  const response = {
    status: "success",
    stats,
    history
  };
  
  if (history.length === 0) {
    response.message = "No auction history available";
  }
  
  return response;
};

const handleFilterProductsByPrice = (data) => {
  const { maxPrice } = data;
  
  if (!maxPrice || isNaN(maxPrice)) {
    return {
      status: "error",
      message: "Please specify a valid maxPrice amount"
    };
  }

  const maxAmount = parseFloat(maxPrice);
  const affordableProducts = [];

  for (const [name, product] of Object.entries(PRODUCTS)) {
    if (product.highest_bid < maxAmount) {
      affordableProducts.push({
        name,
        current_price: product.highest_bid,
        // description: product.description,
        // time_remaining: getTimeRemaining(product.end_time),
        bids: product.bids,
        highest_bidder: product.highest_bidder
      });
    }
  }

  // Sort by price (lowest first)
  affordableProducts.sort((a, b) => a.current_price - b.current_price);

  return {
    status: "success",
    max_price: maxAmount,
    count: affordableProducts.length,
    products: affordableProducts,
    message: affordableProducts.length > 0 
      ? `Found ${affordableProducts.length} products under ₹${maxAmount}`
      : `No products found under ₹${maxAmount}`
  };
};

const handleFullAuctionSummary = (data) => {
  const summary = [];
  for (const [name, item] of Object.entries(PRODUCTS)) {
    summary.push({
      product: name,
      description: item.description,
      highest_bid: item.highest_bid,
      time_remaining: getTimeRemaining(item.end_time),
      total_bids: item.bids
    });
  }
  return { summary };
};

const INTENT_HANDLERS = {
  "ListAvailableProductsIntent": handleListAvailableProducts,
  "AskProductIntent": handleAskProduct,
  "PlaceBidIntent": handlePlaceBid,
  "GetStatsIntent": handleGetStats,
  "GetBiddingHistoryIntent": handleGetBiddingHistory,
  "GetMyBidStatusIntent": handleGetMyBidStatus,
  "GetReceiptIntent": handleGetReceipt,
  "GetAllMyBidsIntent": handleGetAllMyBids,
  "GetNotifications": handleUserNotifications,
  "HaveIBeenOutbidIntent": handleHaveIBeenOutbid,
  "GetAuctionHistoryIntent": handleGetAuctionHistory,
  "FullAuctionSummaryIntent": handleFullAuctionSummary,
  "AutoBidIntent": handleAutoBid,
  "ActionAtmosphereIntent": handleAuctionAtmosphere,
  "ProductCompetitivenessIntent": handleProductCompetitiveness,
  "ProductRecommendationIntent": handleProductRecommendationIntent,
  "SetBudgetIntent": handleSetBudgetIntent,
  "BudgetDetailsIntent": handleBudgetDetailsIntent,
  "FilterProductsByPriceIntent": handleFilterProductsByPrice
};


// Webhook Endpoint
app.post('/webhook', (req, res) => {
  const payload = req.body;
  const intent = payload.intent;
  const variables = payload.extracted_variables || {};
  const user_id = payload.user_id;
  const timestamp = payload.timestamp || new Date().toISOString();

  console.log(`\n📩 [Incoming Request] at ${timestamp}`);
  console.log(`User: ${user_id}, Intent: ${intent}`);
  console.log(`Variables:`, variables);


  const handler = INTENT_HANDLERS[intent] || (() => ({ message: "Unknown intent" }));
  const response_data = handler(variables);



  if (intent === "PlaceBidIntent" && response_data.status?.includes("bid_placed")) {
    io.emit('bid_notification', {
      user: user_id,
      product: variables.productName,
      amount: variables.bidAmount,
      timestamp: new Date().toISOString()
    });
  }

  res.json(response_data);
});




app.get('/products', (req, res) => {
  res.json({ products: PRODUCTS });
});

app.get('/products/:product_id', (req, res) => {
  const product_id = req.params.product_id;
  if (PRODUCTS[product_id]) {
    res.json(PRODUCTS[product_id]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error',
    message: 'Something broke!',
    error: err.message
  });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}`);
});