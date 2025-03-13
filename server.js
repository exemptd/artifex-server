require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());

// Проверяем, загружены ли переменные среды
if (!process.env.STRIPE_SECRET_KEY || !process.env.CLIENT_URL) {
    console.error("❌ Ошибка: Переменные среды не загружены.");
    process.exit(1);
}

// Логируем CLIENT_URL для проверки
console.log("✅ CLIENT_URL:", process.env.CLIENT_URL);

// Разрешаем запросы CORS
app.use(cors({
    origin: "*", // Разрешаем ВСЕМ доменам (для тестов)
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type"],
    credentials: true, 
}));

app.post("/create-checkout-session", async (req, res) => {
    try {
        const { items, orderId } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        const lineItems = items.map((item) => ({
            price_data: {
                currency: "usd",
                product_data: { name: item.name },
                unit_amount: item.price * 100, // Stripe требует сумму в центах
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/success?orderId=${orderId}`,
            cancel_url: `${process.env.CLIENT_URL}/cart-page`,
        });

        console.log("✅ Stripe session created:", session); // Логируем ответ
        
        res.json({ sessionId: session.id, url: session.url });

    } catch (error) {
        console.error("❌ Error creating checkout session:", error);
        res.status(500).json({ error: error.message });
    }
});


const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
    res.send("🔥 Server is running! Go to /create-checkout-session");
});
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));

