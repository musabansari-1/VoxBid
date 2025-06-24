const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const moment = require('moment');

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
    "bids": 4
  },
  "Vintage Watch": {
    "description": "Classic 1960s Swiss automatic wristwatch in mint condition.",
    "highest_bid": 7600,
    "highest_bidder": "Meera Kapoor",
    "end_time": moment().add(8, 'minutes').toISOString(),
    "history": [5000, 6000, 6800, 7600],
    "bids": 4
  },
  "iPad": {
    "description": "Brand new Apple iPad Pro 11-inch with M2 chip.",
    "highest_bid": 52000,
    "highest_bidder": "Rohan Verma",
    "end_time": moment().add(10, 'minutes').toISOString(),
    "history": [48000, 50000, 51000, 52000],
    "bids": 4
  },
  "PS5": {
    "description": "Sony PlayStation 5 with DualSense Controller and Horizon bundle.",
    "highest_bid": 42000,
    "highest_bidder": "Simran Bhatia",
    "end_time": moment().add(6, 'minutes').toISOString(),
    "history": [39000, 40000, 41000, 42000],
    "bids": 4
  },
  "MacBook Air": {
    "description": "Apple MacBook Air M2 (2023), 256GB SSD, Space Gray.",
    "highest_bid": 92000,
    "highest_bidder": "Nikhil Joshi",
    "end_time": moment().add(12, 'minutes').toISOString(),
    "history": [87000, 89000, 91000, 92000],
    "bids": 4
  },
  "Gaming Chair": {
    "description": "Ergonomic RGB gaming chair with adjustable armrests and lumbar support.",
    "highest_bid": 18000,
    "highest_bidder": "Tanvi Desai",
    "end_time": moment().add(7, 'minutes').toISOString(),
    "history": [15000, 16000, 17000, 18000],
    "bids": 4
  },
  "GoPro Hero 12": {
    "description": "GoPro Hero 12 Black with 5K video, waterproof up to 33ft.",
    "highest_bid": 35000,
    "highest_bidder": "Kabir Malik",
    "end_time": moment().add(9, 'minutes').toISOString(),
    "history": [30000, 32000, 34000, 35000],
    "bids": 4
  },
  "iPhone 14": {
    "description": "Apple iPhone 14, 128GB, Midnight Black, brand new.",
    "highest_bid": 73000,
    "highest_bidder": "Ananya Reddy",
    "end_time": moment().add(15, 'minutes').toISOString(),
    "history": [70000, 71000, 72000, 73000],
    "bids": 4
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

// Helper Functions
// Function to handle placing a bid (internal use for both manual and auto-bids)
const placeBidInternal = (socket, product, amount, user_id, is_auto_bid = false) => {
  if (PRODUCTS[product]) {
    const current = PRODUCTS[product].highest_bid;
    if (amount > current) {
      PRODUCTS[product].highest_bid = amount;
      PRODUCTS[product].history.push(amount);
      PRODUCTS[product].bids += 1;
      PRODUCTS[product].highest_bidder = user_id;

      const bid = {
        product,
        user_id,
        amount,
        time: Date.now(),
      };

      if (!USER_BIDS[user_id]) {
        USER_BIDS[user_id] = [];
      }
      USER_BIDS[user_id].push(bid);

      io.emit('bid_update', {
        product,
        highest_bid: amount,
        bids: PRODUCTS[product].bids,
        user: user_id,
        is_auto_bid: is_auto_bid, // Indicate if it's an auto-bid
      });

      // Emit response to the specific socket if it's a real socket
      if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
        socket.emit('bid_response', {
          status: 'success',
          message: `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed successfully on ${product} for ₹${amount}.`,
          product,
          amount,
          is_auto_bid,
        });
      } else {
        // For dummy sockets (e.g., from intent handlers or timer),
        // broadcast a general notification or log.
        io.emit('general_notification', {
            type: 'bid_status',
            message: `${is_auto_bid ? 'Auto-bid' : 'Bid'} placed for ${product} by ${user_id} for ₹${amount}.`,
            product,
            amount,
            user: user_id,
            is_auto_bid,
        });
        console.log(`[Dummy Socket Action] ${is_auto_bid ? 'Auto-bid' : 'Bid'} placed for ${product} by ${user_id} for ₹${amount}.`);
      }
      return true;
    } else {
      if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
        socket.emit('bid_response', {
          status: 'error',
          message: `Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`,
          product,
          amount,
          is_auto_bid,
        });
      } else {
        io.emit('general_notification', {
            type: 'bid_status_error',
            message: `Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`,
            product,
            amount,
            user: user_id,
            is_auto_bid,
        });
        console.log(`[Dummy Socket Action] Bid amount ₹${amount} is too low for ${product}. Current highest bid: ₹${current}.`);
      }
      return false;
    }
  } else {
    if (socket && typeof socket.emit === 'function' && !socket.is_dummy) {
      socket.emit('bid_response', {
        status: 'error',
        message: 'Product not found or auction ended.',
        product,
        amount,
        is_auto_bid,
      });
    } else {
        io.emit('general_notification', {
            type: 'bid_status_error',
            message: `Product ${product} not found or auction ended.`,
            product,
            amount,
            user: user_id,
            is_auto_bid,
        });
        console.log(`[Dummy Socket Action] Product ${product} not found or auction ended.`);
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

const handleUserNotifications = (data) => {
  const user_id = data.user_id;
  const notifications = [];

  for (const bid of USER_BIDS[user_id] || []) {
    const product = bid.product;
    const user_bid = bid.amount;
    const product_data = PRODUCTS[product];

    if (!product_data) continue;

    // Outbid
    if (product_data.highest_bid > user_bid) {
      notifications.push({
        type: "outbid",
        product,
        message: `You've been outbid on ${product}. Highest bid is now ₹${product_data.highest_bid}.`
      });
    }

    // Ending soon (within 2 minutes)
    const time_left_str = getTimeRemaining(product_data.end_time);
    try {
      const mins_left = parseInt(time_left_str.split('m')[0]);
      if (mins_left <= 2) {
        notifications.push({
          type: "ending_soon",
          product,
          message: `${product} auction ends in ${time_left_str}. Last bid: ₹${product_data.highest_bid}`
        });
      }
    } catch (e) {}

    // Auction ended and user won
    if (time_left_str === "Ended" && product_data.highest_bid === user_bid) {
      notifications.push({
        type: "won",
        product,
        message: `You won the auction for ${product} at ₹${user_bid}! 🎉`
      });
    }
  }

  return { notifications };
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

const handlePlaceBid = (data) => {
  const product = data.productName;
  const amount = parseFloat(data.bidAmount);
  const user_id = data.user;

  const dummySocketForIntent = { is_dummy: true, emit: (event, data) => console.log(`[Intent Handler Dummy Socket] Emitting ${event}:`, data) };
  const bidPlaced = placeBidInternal(dummySocketForIntent, product, amount, user_id, false);

  if (bidPlaced) {
    return { status: "bid_placed", product: product, amount: amount, user: user_id };
  } else {
    // If bid wasn't placed, it means it was too low or product not found/ended
    // placeBidInternal already emits specific error messages, so we just return a generic failure for the intent.
    return { status: "bid_failed", product: product, amount: amount, user: user_id };
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
      return { status: 'success', message: `Auto-bid set for ${product} up to ₹${max_amount}. You are currently the highest bidder.`, product: product, max_amount: data.maxBidAmount, user: user_id };
  }

  return {
    status: 'success',
    message: `Auto-bid set for ${product} up to ${data.maxBidAmount}. ${initialBidPlaced ? 'An initial bid was placed.' : ''}`,
    product: product,
    max_amount: max_amount,
    user: user_id
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

const handleGetMyBidStatus = (data) => {
  return { 
    status: "outbid", 
    product: data.productName || "All Products" 
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
  "Get_Notifications": handleUserNotifications,
  "HaveIBeenOutbidIntent": handleHaveIBeenOutbid,
  "GetAuctionHistoryIntent": handleGetAuctionHistory,
  "FullAuctionSummaryIntent": handleFullAuctionSummary,
  "AutoBidIntent": handleAutoBid,
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

// REST Endpoints
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