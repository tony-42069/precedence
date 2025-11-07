from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging
from backend.integrations.polymarket import polymarket
from backend.database import get_db
from backend.models import Trade
from datetime import datetime
from decimal import Decimal

router = APIRouter()
logger = logging.getLogger(__name__)

class TradeRequest(BaseModel):
    market_id: str
    token_id: str
    side: str  # "YES" or "NO"
    amount: float
    price: float
    wallet_address: str

class TradeResponse(BaseModel):
    success: bool
    order_id: str = None
    transaction_hash: str = None
    error: str = None

@router.post("/api/trade", response_model=TradeResponse)
async def place_trade(
    trade_request: TradeRequest,
    db: Session = Depends(get_db)
):
    """
    Place a trade on Polymarket through Precedence backend.
    This route handles builder attribution and trade tracking.
    """
    try:
        logger.info(f"Placing trade: {trade_request.dict()}")

        # Use your existing Polymarket client
        result = polymarket.create_market_order(
            market_id=trade_request.market_id,
            side='buy' if trade_request.side == 'YES' else 'sell',
            size=trade_request.amount,
            price=trade_request.price,
            test=False  # Set to True for testing first!
        )

        if not result.get('success'):
            raise HTTPException(
                status_code=400,
                detail=result.get('error', 'Trade failed')
            )

        # Save trade to database
        db_trade = Trade(
            market_id=trade_request.market_id,
            user_wallet=trade_request.wallet_address,
            side=trade_request.side,
            amount=Decimal(str(trade_request.amount)),
            price=Decimal(str(trade_request.price)),
            order_id=result.get('order_id'),
            transaction_hash=result.get('transaction_hash'),
            status='confirmed',
            created_at=datetime.utcnow()
        )
        db.add(db_trade)
        db.commit()

        logger.info(f"Trade successful: {result}")

        return TradeResponse(
            success=True,
            order_id=result.get('order_id'),
            transaction_hash=result.get('transaction_hash')
        )

    except Exception as e:
        logger.error(f"Trade failed: {str(e)}")
        return TradeResponse(
            success=False,
            error=str(e)
        )
