export function CubeLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-12 p-12 min-h-[400px] bg-slate-950/0 perspective-container">
      <div className="relative w-24 h-24 flex items-center justify-center preserve-3d">
        <div className="relative w-full h-full preserve-3d animate-cube-spin">
          <div className="absolute inset-0 m-auto w-8 h-8 bg-white rounded-full blur-md shadow-[0_0_40px_rgba(255,255,255,0.8)] animate-pulse-fast" />

          <div className="side-wrapper front">
            <div className="face bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          </div>
          <div className="side-wrapper back">
            <div className="face bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          </div>
          <div className="side-wrapper right">
            <div className="face bg-purple-500/10 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
          </div>
          <div className="side-wrapper left">
            <div className="face bg-purple-500/10 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
          </div>
          <div className="side-wrapper top">
            <div className="face bg-indigo-500/10 border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
          </div>
          <div className="side-wrapper bottom">
            <div className="face bg-indigo-500/10 border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
          </div>
        </div>

        <div className="absolute -bottom-20 w-24 h-8 bg-black/40 blur-xl rounded-[100%] animate-shadow-breathe" />
      </div>

      <div className="flex flex-col items-center gap-1 mt-2">
        <h3 className="text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase">
          Loading
        </h3>
        <p className="text-xs text-slate-400">
          Preparing your experience, please wait...
        </p>
      </div>
    </div>
  );
}

export default CubeLoader;