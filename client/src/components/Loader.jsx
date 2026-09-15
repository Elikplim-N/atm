import logo from '../assets/gcb-logo.png';

// Branded loading indicator: the GCB logo with a slow pulsing ring around it.
// `label` is shown beneath, `inline` renders compactly for use inside buttons
// or small areas instead of centered full-block.
export default function Loader({ label, inline = false }) {
  return (
    <div className={inline ? 'gcb-loader gcb-loader-inline' : 'gcb-loader'}>
      <span className="gcb-loader-ring">
        <img src={logo} alt="" className="gcb-loader-logo" />
      </span>
      {label && <span className="gcb-loader-label">{label}</span>}
    </div>
  );
}
