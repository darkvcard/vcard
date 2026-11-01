import { GlitchText, Panel } from '../components/GlitchText'
import { TermLink } from '../components/TermButton'

export function NotFound() {
  return (
    <div className="animate-rise flex min-h-[60vh] items-center justify-center">
      <Panel accent="alert" label="err_404" className="w-full max-w-lg p-8 text-center sm:p-12">
        <p className="hud text-alert/60">// route_not_found</p>
        <GlitchText
          as="h1"
          text="404"
          className="mt-4 block font-mono text-6xl font-extrabold tracking-tighter sm:text-7xl"
        />
        <p className="mt-4 font-mono text-[11.5px] leading-relaxed text-ash/60">
          This node does not exist, or it was burned before you arrived.
          Nothing was logged. Nothing was seen.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <TermLink to="/" prompt="&gt;" className="px-6 py-3">
            RETURN_HOME
          </TermLink>
          <TermLink to="/shop" variant="ghost" className="px-6 py-3">
            BROWSE_VAULT
          </TermLink>
        </div>
      </Panel>
    </div>
  )
}
