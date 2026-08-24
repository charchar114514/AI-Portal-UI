import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const AI_BRIDGE_URL = "http://127.0.0.1:5000/v1/chat/completions";
const MAX_CONTEXT_MESSAGES = 20;
const SYSTEM_MESSAGE = {
  role: "system",
  content: "Format every response as readable GitHub-flavored Markdown. Use headings, lists, tables, bold text, and code blocks when they improve clarity. Do not output raw HTML or script tags.",
};
const initialMessages = [];

function buildApiMessages(history, currentInput) {
  const recentHistory = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-MAX_CONTEXT_MESSAGES)
    .map(({ role, text }) => ({ role, content: text }));

  return [
    SYSTEM_MESSAGE,
    ...recentHistory,
    { role: "user", content: currentInput },
  ];
}

function AssistantMessage({ content }) {
  return (
    <div className="message-body markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef(null);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // State updates are asynchronous. Build the LLM context from the existing
    // history plus the current input so the latest user message is never lost.
    const apiMessages = buildApiMessages(messages, trimmed);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const apiResponse = await fetch(AI_BRIDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Caller": "demo-client",
          "X-AI-Purpose": "kyc_risk_review_assist",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages: apiMessages,
          stream: false,
        }),
      });
      const payload = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(payload?.error?.message || "AI Bridge request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.choices?.[0]?.message?.content || "The model returned no text.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `\u62b1\u6b49\uff0c\u6d88\u606f\u53d1\u9001\u5931\u8d25\uff1a${error.message || "\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="chat-card">
        <header className="chat-header">
          <div><p className="eyebrow">Tauri + React</p><h1>AI Portal</h1></div>
          <span className="status-badge">AI Bridge connected</span>
        </header>
        <div className="message-list" ref={messageListRef}>
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
              <span className="message-label">{message.role === "assistant" ? "AI" : "You"}</span>
              {message.role === "assistant"
                ? <AssistantMessage content={message.text} />
                : <p>{message.text}</p>}
            </article>
          ))}
          {loading && <article className="message assistant typing"><span className="message-label">AI</span><p>Processing through AI Bridge...</p></article>}
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <input value={input} onChange={(event) => setInput(event.currentTarget.value)} placeholder="Type a message..." />
          <button type="submit" disabled={loading}>{loading ? "Sending" : "Send"}</button>
        </form>
      </section>
    </main>
  );
}

export default App;
