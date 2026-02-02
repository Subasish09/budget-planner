window.creditCardDataRaw = [
    {
        id: 'hdfc-regalia',
        bank: 'HDFC Bank',
        name: 'Regalia Gold',
        type: 'Visa',
        last4: '4512',
        // Pure Black base with Sharp Gold diagonal tip
        color: 'linear-gradient(115deg, #000000 0%, #000000 70%, #d4af37 70%, #fcf6ba 85%, #aa8e28 100%)',
        textColor: '#fcf6ba', // Light Gold text
        lounge: { hasAccess: true, total: 12, used: 0 },
        transactions: []
    },
    {
        id: 'tata-neu',
        bank: 'HDFC Bank',
        name: 'Tata Neu Infinity',
        type: 'UPI', // Works on UPI (RuPay)
        last4: '8841',
        // Deep fluorescent Purple to Dark Violet/Black
        color: 'linear-gradient(135deg, #5a189a 0%, #3c096c 40%, #10002b 100%)',
        textColor: '#fff',
        lounge: { hasAccess: true, total: 8, used: 0 },
        transactions: []
    },
    {
        id: 'icici-mmt-master',
        bank: 'ICICI Bank',
        name: 'MMT Signature',
        type: 'MasterCard',
        last4: '2209',
        // MMT Sunset Theme: Orange/Yellow top, Dark Earth bottom
        color: 'linear-gradient(180deg, #ea580c 0%, #facc15 35%, #290803 36%, #0f0502 100%)',
        textColor: '#fff',
        lounge: { hasAccess: true, total: 8, used: 0 },
        transactions: [] // MakeMyTrip
    },
    {
        id: 'flipkart-axis',
        bank: 'Axis Bank',
        name: 'Flipkart Axis',
        type: 'MasterCard', // Often MC
        last4: '9012',
        // Black base with Blue-to-Pink ribbon streak
        color: 'linear-gradient(125deg, #000000 25%, #2563eb 45%, #db2777 65%, #000000 85%)',
        textColor: '#fff',
        lounge: { hasAccess: true, total: 4, used: 0 }, // Often has 4/year
        transactions: []
    },
    {
        id: 'icici-mmt-upi',
        bank: 'ICICI Bank',
        name: 'MMT UPI',
        type: 'UPI',
        last4: 'UPI',
        color: 'linear-gradient(180deg, #ea580c 0%, #facc15 35%, #290803 36%, #0f0502 100%)', // Same MMT Theme
        textColor: '#fff',
        lounge: { hasAccess: false },
        transactions: []
    },
    {
        id: 'hdfc-upi',
        bank: 'HDFC Bank',
        name: 'Digital UPI',
        type: 'UPI',
        last4: 'UPI',
        color: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', // Slate
        textColor: '#fff',
        lounge: { hasAccess: false },
        transactions: []
    }
];
