import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const app = express();
const port = Number(process.env.API_PORT || 3001);
const chromaUrl = process.env.CHROMA_URL || 'http://127.0.0.1:8000';
const collectionName = process.env.CHROMA_COLLECTION || 'swasthya_drishti_guide';
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174' }));
app.use(express.json({ limit: '32kb' }));
let vectorStore;
let vectorStorePromise;
let knowledgeReady = false;

const knowledge = [
  { category: 'exercise', title: 'Bodyweight squat', text: 'Exercise guide: bodyweight squat. Stand with feet about shoulder width and toes comfortable. Brace gently, sit hips back and bend knees within a comfortable range, then press through the feet to stand. Keep the movement controlled and stop for pain, dizziness, or unusual shortness of breath. The app’s pose overlay estimates body landmarks; the rep count is an approximate knee-angle demo, not a clinical assessment.' },
  { category: 'exercise', title: 'Wall push-up', text: 'Exercise guide: wall push-up. Face a stable wall, place hands around shoulder height and slightly wider than the shoulders. Step back, keep the body in a comfortable straight line, bend elbows to bring the chest toward the wall, then press away. Adjust distance and range to comfort. Stop if painful.' },
  { category: 'exercise', title: 'Standing knee raise', text: 'Exercise guide: standing knee raise. Stand near a stable support if useful. Lift one knee only as high as comfortable while keeping balance, lower with control, and alternate sides. Avoid forcing hip range. Stop for pain or dizziness.' },
  { category: 'exercise', title: 'Warm-up and safety', text: 'Movement guidance: begin gently, use a clear non-slip space, wear comfortable clothing, and increase intensity gradually. Keep the entire body visible for camera pose landmarks. Camera inference happens locally in the browser preview. The camera is optional and only starts after explicit permission. This product does not diagnose injury or replace coaching or medical advice.' },
  { category: 'exercise', title: 'Yoga and pranayama', text: 'Yoga and breathing: choose a stable surface and a comfortable range. Tree pose can be practiced beside a wall or chair for balance. Surya Namaskar may be adapted or skipped if it does not feel comfortable. For alternate-nostril breathing, sit comfortably and keep breaths easy; do not hold or force the breath. Stop if dizzy or uncomfortable.' },
  { category: 'nutrition', title: 'Moong dal and paneer chilla', text: 'Recipe: moong dal and paneer chilla, 2 servings. Ingredients: 100 g soaked split moong dal, 100 g paneer, onion, ginger, coriander, and about 1 tsp oil. Blend drained dal into batter, add aromatics, cook thin chillas, add paneer, fold and warm. Estimated per serving: protein 24 g, fat 11 g, fibre 8 g, carbohydrates 32 g, about 325 kcal. Nutrition estimates vary with brands and portions.' },
  { category: 'nutrition', title: 'Sprouted moong chaat', text: 'Recipe: sprouted moong chaat, 1 serving. Combine 1 cup steamed moong sprouts, half cup cooked chickpeas, tomato, cucumber, 2 tbsp peanuts, lemon, coriander and spices. Estimated: protein 19 g, fat 7 g, fibre 12 g, carbohydrates 39 g, about 295 kcal. Nutrition estimates vary with ingredient amounts; toppings can change values.' },
  { category: 'nutrition', title: 'Tofu bhurji with millet roti', text: 'Recipe: tofu bhurji with millet roti, 1 serving. Crumble 150 g tofu. Cook with tomato, onion, capsicum, spinach, spices and about 1 tsp oil. Serve with one bajra roti. Estimated: protein 27 g, fat 13 g, fibre 9 g, carbohydrates 38 g, about 375 kcal. Values vary by tofu and flour brand and serving size.' },
  { category: 'nutrition', title: 'Besan chilla with hung curd', text: 'Recipe: besan chilla with hung curd, 1 serving. Mix 60 g gram flour with water, spices and vegetables, cook with about half tsp oil, and serve with 100 g thick plain curd. Estimated: protein 22 g, fat 10 g, fibre 7 g, carbohydrates 34 g, about 310 kcal. Curd protein and recipe macros vary by brand and portion.' },
  { category: 'nutrition', title: 'Balanced meal planning', text: 'Everyday meal planning: build meals from familiar staples, vegetables or fruit, and a protein source such as dal, beans, chickpeas, dairy, eggs, tofu, soy, nuts or seeds, depending on preference. Use recipe macros as estimates, not exact medical targets. Ask about allergies, dietary preferences, budget, region, and available ingredients before suggesting a plan. Do not make claims about curing disease or prescribe restrictive diets.' },
  { category: 'nutrition', title: 'Nutrition safety', text: 'Nutrition assistant safety: ask users about food allergies and dietary restrictions before a meal plan. Avoid guaranteeing weight change, treating health conditions, or replacing a registered dietitian. For pregnancy, chronic illness, eating disorder concerns, or medically prescribed diets, advise consultation with a qualified clinician or dietitian.' }
];

async function getVectorStore() {
  if (vectorStore) return vectorStore;
  if (!vectorStorePromise) vectorStorePromise = (async () => {
    if (!process.env.GOOGLE_API_KEY) throw new Error('Set GOOGLE_API_KEY in .env to activate Gemini and the Google embedding model.');
    const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GOOGLE_API_KEY, model: 'gemini-embedding-001', outputDimensionality: 768 });
    const store = new Chroma(embeddings, { url: chromaUrl, collectionName, numDimensions: 768 });
    await store.ensureCollection();
    const count = await store.collection.count();
    if (!count) await store.addDocuments(knowledge.map(item => new Document({ pageContent: item.text, metadata: { category: item.category, title: item.title } })));
    return store;
  })();
  try {
    vectorStore = await vectorStorePromise;
    knowledgeReady = true;
    return vectorStore;
  } catch (error) {
    vectorStorePromise = undefined;
    throw error;
  }
}

const prompt = ChatPromptTemplate.fromMessages([
  ['system', `You are Swasthya Drishti, a kind, practical wellness guide. Answer questions about exercise, yoga, breathing, nutrition, and meal preparation. Use the retrieved project knowledge as your source for app features and recipe macros. Give safe, clear steps. Before making a personalized meal plan, ask about allergies, dietary restrictions, food preferences, budget, and serving count if those details are not known. Do not diagnose injuries, make medical claims, or prescribe treatment or strict diets. For pain, chronic conditions, pregnancy, allergies, or medically significant dietary needs, recommend a qualified clinician or dietitian. If retrieval does not contain the answer, say so and give general, cautious guidance. Distinguish estimated recipe macros from exact values. Current module: {module}. Retrieved knowledge: {context}`],
  new MessagesPlaceholder('history'),
  ['human', '{question}']
]);

app.get('/api/health', async (_req, res) => {
  let chromaConfigured = false;
  try { const heartbeat = await fetch(`${chromaUrl}/api/v2/heartbeat`); chromaConfigured = heartbeat.ok; } catch {}
  res.json({ ok: true, geminiConfigured: Boolean(process.env.GOOGLE_API_KEY), chromaConfigured, knowledgeReady });
});
app.post('/api/chat', async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ error: 'Enter a question to continue.' });
    if (message.length > 4000) return res.status(413).json({ error: 'Keep questions under 4,000 characters.' });
    const store = await getVectorStore();
    const moduleName = String(req.body?.module || '');
    const category = moduleName === 'Nutrition' ? 'nutrition' : ['Sports Scout', 'Digital Gymnast', 'Yoga & Pranayama'].includes(moduleName) ? 'exercise' : undefined;
    const matches = await store.similaritySearch(message, 5, category ? { category } : undefined);
    const context = matches.map(doc => `[${doc.metadata.category}] ${doc.metadata.title}: ${doc.pageContent}`).join('\n\n') || 'No matching project knowledge was retrieved.';
    const model = new ChatGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.6-flash', temperature: 0.35, maxRetries: 2 });
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content)) : [];
    const chain = prompt.pipe(model);
    const result = await chain.invoke({ module: String(req.body?.module || 'General wellbeing').slice(0, 80), context, history, question: message });
    const answer = typeof result.content === 'string' ? result.content : result.content.map(part => part.type === 'text' ? part.text : '').join('');
    res.json({ answer, sources: matches.map(doc => doc.metadata.title), provider: 'Gemini + LangChain + Chroma' });
  } catch (error) {
    console.error('Guide request failed:', error.message);
    const status = /GOOGLE_API_KEY/.test(error.message) ? 503 : /ECONNREFUSED|fetch failed/i.test(error.message) ? 503 : 500;
    res.status(status).json({ error: status === 503 ? error.message.includes('GOOGLE_API_KEY') ? error.message : 'Cannot reach Chroma. Start the local Chroma service and try again.' : 'The AI guide could not complete this request.' });
  }
});
app.listen(port, '127.0.0.1', () => console.log(`SwasthyaDrishti AI API listening on http://127.0.0.1:${port}`));


