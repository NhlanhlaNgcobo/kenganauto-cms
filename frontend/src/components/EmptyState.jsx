import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full w-full">
            <div className="w-20 h-20 mb-6 rounded-3xl flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.02))',
                    border: '1px solid rgba(201,168,76,0.2)',
                    boxShadow: '0 0 40px rgba(201,168,76,0.08)'
                }}>
                <Icon size={32} style={{ color: '#C9A84C' }} />
            </div>

            <h3 className="font-outfit font-black text-xl text-white mb-2">{title}</h3>

            <p className="text-sm max-w-sm mb-8 leading-relaxed" style={{ color: 'rgba(240,237,232,0.45)' }}>
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="btn-gold py-3 px-6 rounded-xl font-bold flex items-center gap-2"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
