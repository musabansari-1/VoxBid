from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import Column, Integer, String, ForeignKey, Float, create_engine, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import uvicorn
import datetime
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
Base = declarative_base()
engine = create_engine("sqlite:///auction.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
session = SessionLocal()

# Models
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    description = Column(String)
    time_remaining = Column(String)
    bids = relationship("Bid", back_populates="product")

class Bid(Base):
    __tablename__ = "bids"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    user = Column(String)
    amount = Column(Float)
    timestamp = Column(DateTime, )
    product = relationship("Product", back_populates="bids")

Base.metadata.create_all(bind=engine)

# Dummy data
def seed_products():
    products = [
        ("Chessboard", "Handcrafted wooden chessboard", "3 minutes"),
        ("Vintage Watch", "Classic 1960s Swiss watch", "8 minutes"),
        ("iPad", "Brand new 11-inch iPad Pro", "10 minutes"),
        ("PS5", "PlayStation 5 with DualSense Controller", "6 minutes"),
        ("MacBook Air", "Apple MacBook Air M2", "12 minutes"),
    ]
    for name, desc, time in products:
        if not session.query(Product).filter_by(name=name).first():
            session.add(Product(name=name, description=desc, time_remaining=time))
    session.commit()

seed_products()

# Generate dynamic end times
def generate_end_time(minutes):
    return (datetime.datetime.now() + datetime.timedelta(minutes=minutes)).isoformat()

# Dummy product database with real countdown
PRODUCTS = {
    "Chessboard": {
        "description": "Handcrafted wooden chessboard",
        "highest_bid": 3500,
        "end_time": generate_end_time(3),
        "history": [2000, 2500, 3100, 3500],
        "bids": 4
    },
    "Vintage Watch": {
        "description": "Classic 1960s Swiss watch",
        "highest_bid": 7600,
        "end_time": generate_end_time(8),
        "history": [5000, 6000, 6800, 7600],
        "bids": 4
    },
    "iPad": {
        "description": "Brand new 11-inch iPad Pro",
        "highest_bid": 52000,
        "end_time": generate_end_time(10),
        "history": [48000, 50000, 51000, 52000],
        "bids": 4
    },
    "PS5": {
        "description": "PlayStation 5 with DualSense Controller",
        "highest_bid": 42000,
        "end_time": generate_end_time(6),
        "history": [39000, 40000, 41000, 42000],
        "bids": 4
    },
    "MacBook Air": {
        "description": "Apple MacBook Air M2, 256GB SSD",
        "highest_bid": 92000,
        "end_time": generate_end_time(12),
        "history": [87000, 89000, 91000, 92000],
        "bids": 4
    },
}

# Store expired products here
CLOSED_PRODUCTS = {}

@app.on_event("startup")
async def auction_timer():
    async def check_expired_auctions():
        while True:
            now = datetime.datetime.now()
            expired = []
            for name, item in list(PRODUCTS.items()):
                end_time = datetime.datetime.fromisoformat(item["end_time"])
                if now >= end_time:
                    CLOSED_PRODUCTS[name] = PRODUCTS.pop(name)
                    print(f"🛑 Auction ended for: {name}")
            await asyncio.sleep(10)  # Check every 10 seconds
    asyncio.create_task(check_expired_auctions())

# Helper to format remaining time
def get_time_remaining(end_time_str):
    end_time = datetime.datetime.fromisoformat(end_time_str)
    remaining = (end_time - datetime.datetime.now()).total_seconds()
    if remaining <= 0:
        return "Ended"
    minutes, seconds = divmod(int(remaining), 60)
    return f"{minutes}m {seconds}s"

# Intent handler functions
def handle_list_available_products(data):
    return {"products": list(PRODUCTS.keys())}

def handle_ask_product(data):
    product = data.get("productName")
    if product in PRODUCTS:
        item = PRODUCTS[product]
        return {
            "product": product,
            "description": item["description"],
            "highest_bid": item["highest_bid"],
            "time_remaining": get_time_remaining(item["end_time"])
        }
    return {"error": "Product not found"}

def handle_place_bid(data):
    product = data.get("productName")
    amount = data.get("bidAmount")
    if product in PRODUCTS:
        current = PRODUCTS[product]["highest_bid"]
        if amount > current:
            PRODUCTS[product]["highest_bid"] = amount
            PRODUCTS[product]["history"].append(amount)
            PRODUCTS[product]["bids"] += 1
            return {"status": "bid_placed", "product": product, "amount": amount}
        else:
            return {"status": "bid_too_low", "highest_bid": current}
    return {"error": "Product not found or auction ended"}

def handle_get_stats(data):
    product = data.get("productName")
    if product in PRODUCTS:
        return {
            "product": product,
            "bids": PRODUCTS[product]["bids"],
            "highest": PRODUCTS[product]["highest_bid"]
        }
    return {"error": "Product not found"}

def handle_get_bidding_history(data):
    product = data.get("productName")
    if product in PRODUCTS:
        return {
            "product": product,
            "history": PRODUCTS[product]["history"]
        }
    return {"error": "Product not found"}

def handle_get_my_bid_status(data):
    return {"status": "outbid", "product": data.get("productName", "All Products")}

def handle_get_receipt(data):
    return {"status": "receipt_sent", "email": data.get("email")}

def handle_get_all_my_bids(data):
    return {"bids": ["Chessboard: ₹4000", "iPad: ₹3000"]}

def handle_cancel_bid(data):
    return {"status": "bid_cancelled", "product": data.get("cancelBidProduct")}

def handle_auto_bid(data):
    return {"status": "auto_bid_set", "product": data.get("productName"), "limit": data.get("maxAutoBidAmount")}

def handle_cancel_auto_bid(data):
    return {"status": "auto_bid_cancelled", "product": data.get("productName")}

def handle_rebid_prompt(data):
    return {"status": "rebid_processed", "product": data.get("productName"), "confirmation": data.get("rebidConfirmation")}

def handle_outbid_notification(data):
    return {"status": "notified_outbid", "product": data.get("productName")}

def handle_help(data):
    return {"message": "You can ask me to place bids, list products, get stats, and more!"}

def handle_end_session(data):
    return {"status": "session_ended"}

def handle_repeat_last_info(data):
    return {"message": "Repeating last information..."}

def handle_report_auction_issue(data):
    return {"status": "issue_reported", "product": data.get("productName"), "issue": data.get("issueType")}

def handle_auction_reminder(data):
    return {"status": "reminder_set", "product": data.get("productName"), "phone": data.get("phoneNumber")}

def handle_confirm_bid(data):
    return {"status": "bid_confirmed", "product": data.get("productName"), "amount": data.get("amount")}

def handle_change_bid(data):
    return {"status": "bid_updated", "product": data.get("productName"), "newAmount": data.get("newAmount")}

def handle_decline_bid(data):
    return {"status": "bid_declined", "product": data.get("productName")}

def handle_welcome(data):
    return {"message": "Welcome to the auction!"}

def handle_unknown(data):
    return {"message": "I'm not sure how to help with that yet."}

def handle_full_auction_summary(data):
    summary = []
    for name, item in PRODUCTS.items():
        summary.append({
            "product": name,
            "description": item["description"],
            "highest_bid": item["highest_bid"],
            "time_remaining": get_time_remaining(item["end_time"]),
            "total_bids": item["bids"]
        })
    return {"summary": summary}

INTENT_HANDLERS = {
    "ListAvailableProductsIntent": handle_list_available_products,
    "AskProductIntent": handle_ask_product,
    "PlaceBidIntent": handle_place_bid,
    "GetStatsIntent": handle_get_stats,
    "GetBiddingHistoryIntent": handle_get_bidding_history,
    "GetMyBidStatusIntent": handle_get_my_bid_status,
    "GetReceiptIntent": handle_get_receipt,
    "GetAllMyBidsIntent": handle_get_all_my_bids,
    "CancelBidIntent": handle_cancel_bid,
    "AutoBidIntent": handle_auto_bid,
    "CancelAutoBidIntent": handle_cancel_auto_bid,
    "RebidPromptIntent": handle_rebid_prompt,
    "OutbidNotificationIntent": handle_outbid_notification,
    "HelpIntent": handle_help,
    "EndSessionIntent": handle_end_session,
    "RepeatLastInfoIntent": handle_repeat_last_info,
    "ReportAuctionIssueIntent": handle_report_auction_issue,
    "AuctionReminderIntent": handle_auction_reminder,
    "ConfirmBidIntent": handle_confirm_bid,
    "ChangeBidIntent": handle_change_bid,
    "DeclineBidIntent": handle_decline_bid,
    "WelcomeIntent": handle_welcome,
    "UnknownIntent": handle_unknown,
    "FullAuctionSummaryIntent": handle_full_auction_summary,
}

@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.json()
    intent = payload.get("intent")
    variables = payload.get("extracted_variables", {})
    user_id = payload.get("user_id")
    timestamp = payload.get("timestamp", datetime.datetime.now().isoformat())

    print(f"\n📩 [Incoming Request] at {timestamp}")
    print(f"User: {user_id}, Intent: {intent}")
    print(f"Variables: {variables}")

    handler = INTENT_HANDLERS.get(intent, handle_unknown)
    response_data = handler(variables)
    return JSONResponse(content=response_data)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)

