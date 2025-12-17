"""
Fee API Routes for Precedence

Provides endpoints for fee estimation and transaction history.
Proxies to the Node.js trading service for actual fee operations.
"""

import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import httpx

logger = logging.getLogger(__name__)

router = APIRouter()

# Trading service URL (Node.js service on port 5002)
TRADING_SERVICE_URL = os.getenv("TRADING_SERVICE_URL", "http://localhost:5002")

# Fee configuration (should match trading_service_v2.js)
PRECEDENCE_FEE_PERCENT = float(os.getenv("PRECEDENCE_FEE_PERCENT", "1"))
PRECEDENCE_TREASURY_ADDRESS = os.getenv("PRECEDENCE_TREASURY_ADDRESS", "")


def calculate_fee(trade_value: float, side: str) -> dict:
    """
    Calculate fee for a trade.
    Only SELL orders incur a fee.

    Args:
        trade_value: The trade value in USD
        side: 'buy' or 'sell'

    Returns:
        Fee calculation result
    """
    if side.upper() != "SELL":
        return {
            "tradeValue": trade_value,
            "feePercent": 0,
            "feeAmount": 0,
            "netAmount": trade_value,
            "hasFee": False
        }

    fee_amount = trade_value * (PRECEDENCE_FEE_PERCENT / 100)
    net_amount = trade_value - fee_amount

    return {
        "tradeValue": round(trade_value, 6),
        "feePercent": PRECEDENCE_FEE_PERCENT,
        "feeAmount": round(fee_amount, 6),
        "netAmount": round(net_amount, 6),
        "hasFee": True
    }


@router.get("/estimate")
async def estimate_fee(
    amount: float = Query(..., description="Trade value in USD", gt=0),
    side: str = Query(..., description="Trade side: 'buy' or 'sell'", regex="^(buy|sell|BUY|SELL)$")
):
    """
    Estimate the platform fee for a trade.

    - **BUY orders**: No fee (free to enter positions)
    - **SELL orders**: 1% platform fee

    Returns fee breakdown including trade value, fee amount, and net amount.
    """
    try:
        fee_calc = calculate_fee(amount, side)

        return {
            "success": True,
            **fee_calc,
            "treasuryAddress": PRECEDENCE_TREASURY_ADDRESS
        }

    except Exception as e:
        logger.error(f"Fee estimation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_fee_history(
    wallet_address: Optional[str] = Query(None, alias="walletAddress", description="Filter by wallet address"),
    user_id: Optional[str] = Query(None, alias="userId", description="Filter by user ID")
):
    """
    Get fee transaction history.

    Optionally filter by wallet address or user ID.
    Returns list of fee transactions and totals.
    """
    try:
        # Proxy to trading service
        async with httpx.AsyncClient() as client:
            params = {}
            if wallet_address:
                params["walletAddress"] = wallet_address
            if user_id:
                params["userId"] = user_id

            response = await client.get(
                f"{TRADING_SERVICE_URL}/fees/history",
                params=params,
                timeout=10.0
            )

            if response.status_code == 200:
                return response.json()
            else:
                # Return empty history if service unavailable
                return {
                    "success": True,
                    "transactions": [],
                    "totalCollected": "0",
                    "count": 0
                }

    except httpx.RequestError as e:
        logger.warning(f"Trading service unavailable: {e}")
        # Return empty history if service unavailable
        return {
            "success": True,
            "transactions": [],
            "totalCollected": "0",
            "count": 0,
            "note": "Trading service unavailable"
        }
    except Exception as e:
        logger.error(f"Fee history fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/treasury")
async def get_treasury_stats():
    """
    Get treasury statistics (admin endpoint).

    Returns treasury address, fee percentage, total collected, and transaction count.
    """
    try:
        # Proxy to trading service
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TRADING_SERVICE_URL}/fees/treasury",
                timeout=10.0
            )

            if response.status_code == 200:
                return response.json()
            else:
                # Return basic info if service unavailable
                return {
                    "success": True,
                    "treasuryAddress": PRECEDENCE_TREASURY_ADDRESS,
                    "feePercent": PRECEDENCE_FEE_PERCENT,
                    "totalCollected": "0",
                    "transactionCount": 0,
                    "note": "Trading service unavailable - showing cached config"
                }

    except httpx.RequestError as e:
        logger.warning(f"Trading service unavailable: {e}")
        return {
            "success": True,
            "treasuryAddress": PRECEDENCE_TREASURY_ADDRESS,
            "feePercent": PRECEDENCE_FEE_PERCENT,
            "totalCollected": "0",
            "transactionCount": 0,
            "note": "Trading service unavailable - showing cached config"
        }
    except Exception as e:
        logger.error(f"Treasury stats fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_fee_config():
    """
    Get current fee configuration.

    Returns fee percentage and treasury address.
    """
    return {
        "success": True,
        "feePercent": PRECEDENCE_FEE_PERCENT,
        "treasuryAddress": PRECEDENCE_TREASURY_ADDRESS,
        "feeAppliesTo": "SELL orders only",
        "buyFee": 0,
        "sellFee": PRECEDENCE_FEE_PERCENT
    }
