import asyncio
import websockets
import json

async def live_test():
    async with websockets.connect('ws://localhost:5003') as ws:
        token_id = "any-string-here"  # Ignored now—uses real ID
        await ws.send(json.dumps({"subscribe": token_id}))
        print(f"🎯 Sub sent—using docs conditionId...")

        async for message in ws:
            event = json.loads(message)
            if 'status' in event:
                print(f"✅ {event['status'].upper()}")
                continue
            event_type = event.get('type', 'Unknown')
            payload = event.get('payload', {})
            print(f"🔥 LIVE EVENT: {event_type}")
            print(f"   → Raw Payload: {json.dumps(payload, indent=2)}")
            if event_type == 'price_change':
                changes = payload.get('price_changes', [])
                for ch in changes:
                    print(f"   → 💥 New: {ch.get('price')} | Bid/Ask: {ch.get('best_bid')}/{ch.get('best_ask')}")

asyncio.run(live_test())
