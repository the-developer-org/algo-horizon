import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            apiKey,
            quantity,
            product,
            validity,
            price,
            tag,
            instrumentKey,
            orderType,
            transactionType,
            disclosedQuantity,
            triggerPrice,
            isAmo,
            slice
        } = body;

        // Validate required fields
        if (!apiKey || !quantity || !product || !validity || !instrumentKey || !orderType || !transactionType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Prepare order data for backend server
        const orderData = {
            apiKey,
            quantity: parseInt(quantity),
            product: product, // 'I', 'D', 'MTF'
            validity: validity, // 'DAY', 'IOC'
            price: parseFloat(price) || 0,
            ...(tag && { tag }),
            instrument_token: instrumentKey,
            order_type: orderType, // 'MARKET', 'LIMIT', 'SL', 'SL-M'
            transaction_type: transactionType, // 'BUY', 'SELL'
            ...(disclosedQuantity && { disclosed_quantity: parseInt(disclosedQuantity) }),
            ...(triggerPrice && { trigger_price: parseFloat(triggerPrice) }),
            ...(isAmo !== undefined && { is_amo: isAmo }),
            ...(slice !== undefined && { slice })
        };

        // Make API call to backend server (dummy URL for now)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const response = await axios.post(`${backendUrl}/api/upstox/place-order`, orderData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return NextResponse.json({
            success: true,
            order: response.data
        });

    } catch (error: any) {
        console.error('Order placement error:', error);
        return NextResponse.json(
            {
                error: error.response?.data?.message || error.message || 'Failed to place order',
                details: error.response?.data || error
            },
            { status: error.response?.status || 500 }
        );
    }
}