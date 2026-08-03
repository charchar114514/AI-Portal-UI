import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const initialMessages = [
  {
    role: "assistant",
    text: "你好，我是 AI 助手。请输入你的名字，我会直接返回 Tauri 的问候结果。",
  },
];

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
    ]);
    setInput("");
    setLoading(true);

    try {
      const reply = await invoke("greet", { name: trimmed });
      setMessages((current) => [
        ...current,
        { role: "assistant", text: reply },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "抱歉，消息发送失败，请稍后再试。",
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
          <div>
            <p className="eyebrow">Tauri + React</p>
            <h1>AI Portal</h1>
          </div>
          <span className="status-badge">在线</span>
        </header>

        <div className="message-list">
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`message ${message.role}`}
            >
              <span className="message-label">
                {message.role === "assistant" ? "AI" : "你"}
              </span>
              <p>{message.text}</p>
            </article>
          ))}

          {loading && (
            <article className="message assistant typing">
              <span className="message-label">AI</span>
              <p>正在思考中...</p>
            </article>
          )}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="输入一段消息..."
          />
          <button type="submit" disabled={loading}>
            {loading ? "发送中" : "发送"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;
