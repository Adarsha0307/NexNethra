const WORD = 'Generating';

export function AILoader() {
  return (
    <div className="ai-loader-overlay">
      <div className="loader-wrapper">
        {WORD.split('').map((letter, i) => (
          <span key={i} className="loader-letter" style={{ animationDelay: `${i * 0.08}s` }}>
            {letter}
          </span>
        ))}
        <div className="loader" />
      </div>
    </div>
  );
}

export default AILoader;