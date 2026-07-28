import re

with open('components/LiquidationTracking.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const NewLiquidationModal = ({ commitments, cancellations, credits, onClose, onSave }: any) => {",
    "const NewLiquidationModal = ({ commitments, cancellations, credits, onClose, onSave, pendingCommitments }: any) => {"
)

content = content.replace(
    """<NewLiquidationModal
          commitments={commitments}
          cancellations={cancellations}
          credits={credits}
          onClose={() => setIsModalOpen(false)}
          onSave={onUpdateCommitment}
        />""",
    """<NewLiquidationModal
          commitments={commitments}
          cancellations={cancellations}
          credits={credits}
          pendingCommitments={pendingCommitments}
          onClose={() => setIsModalOpen(false)}
          onSave={onUpdateCommitment}
        />"""
)

with open('components/LiquidationTracking.tsx', 'w') as f:
    f.write(content)
