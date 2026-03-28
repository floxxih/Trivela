import { useId, useState } from 'react';

/**
 * CreateCampaign — form that submits a new campaign to POST /api/campaigns
 * and triggers a refresh of the campaign list on success.
 *
 * Props
 * ─────
 * @param {function} onCampaignCreated – Called after a campaign is successfully created
 *                                       so the parent can refetch the list.
 */
export default function CreateCampaign({ onCampaignCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rewardPerAction, setRewardPerAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const headingId = useId();
  const nameId = useId();
  const descId = useId();
  const rewardId = useId();

  const isValid = name.trim().length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const api = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${api}/api/v1/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          rewardPerAction: Number(rewardPerAction) || 0,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${response.status}`);
      }

      const campaign = await response.json();
      setSuccess(`Campaign "${campaign.name}" created successfully.`);
      setName('');
      setDescription('');
      setRewardPerAction('');

      if (onCampaignCreated) {
        onCampaignCreated(campaign);
      }
    } catch (err) {
      setError(err.message || 'Failed to create campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="create-campaign-section" aria-labelledby={headingId}>
      <h3 id={headingId} className="create-campaign-heading">Create a campaign</h3>
      <p className="create-campaign-description">
        Submit a new campaign to the backend API. It will appear in the list above once created.
      </p>

      <form className="create-campaign-form" onSubmit={handleSubmit}>
        <div className="create-campaign-field">
          <label htmlFor={nameId} className="create-campaign-label">
            Campaign name <span aria-hidden="true">*</span>
          </label>
          <input
            id={nameId}
            type="text"
            className="create-campaign-input"
            placeholder="e.g. Onboarding Rewards"
            value={name}
            disabled={isSubmitting}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="create-campaign-field">
          <label htmlFor={descId} className="create-campaign-label">
            Description
          </label>
          <textarea
            id={descId}
            className="create-campaign-input create-campaign-textarea"
            placeholder="Describe the campaign goals and rules"
            rows={3}
            value={description}
            disabled={isSubmitting}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="create-campaign-field">
          <label htmlFor={rewardId} className="create-campaign-label">
            Reward per action (points)
          </label>
          <input
            id={rewardId}
            type="number"
            min="0"
            step="1"
            className="create-campaign-input"
            placeholder="e.g. 10"
            value={rewardPerAction}
            disabled={isSubmitting}
            onChange={(e) => setRewardPerAction(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-button"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Creating…' : 'Create campaign'}
        </button>
      </form>

      {success && <p className="create-campaign-success" role="status" aria-live="polite">{success}</p>}
      {error && <p className="create-campaign-error" role="alert">{error}</p>}
    </section>
  );
}
