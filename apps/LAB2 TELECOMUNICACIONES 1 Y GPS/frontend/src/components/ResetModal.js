// /src/components/ResetModal.js
import React from 'react';

function ResetModal({ resetPassword, setResetPassword, handleReset, onClose }) {
    return (
        <div className="modal">
        <div className="modal-content">
            <h3>Ingrese contraseña para restablecer</h3>
            <input
            type="password"
            value={resetPassword}
            onChange={e => setResetPassword(e.target.value)}
            placeholder="Contraseña"
            onKeyDown={e => { if (e.key === 'Enter') handleReset(); }}
            />
            <div className="modal-buttons">
            <button onClick={handleReset}>Confirmar</button>
            <button onClick={onClose}>Cancelar</button>
            </div>
        </div>
        </div>
    );
}

export default ResetModal;
