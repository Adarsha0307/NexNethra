import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../api/client';

function AssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello, I\'m Nexnetra AI. How can I help you with your cybersecurity monitoring today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const data = await apiPost('/api/assistant/chat', { message: userMsg.text });
      const replyText = typeof data.reply === 'string' ? data.reply : data.reply?.summary || data.message || 'No response.';
      setMessages(prev => [...prev, { role: 'assistant', text: replyText }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">AI assistant</p>
          <h1>Nexnetra AI</h1>
          <p className="page-copy">Ask about threats, incidents, best practices, or remediation steps.</p>
        </div>
      </header>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {error && <div className="chat-bubble assistant" style={{ borderLeft: '3px solid #ff6b6b' }}>Error: {error}</div>}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="input-area"
            placeholder="Type your security question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button className="primary-btn" onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default AssistantPage;
