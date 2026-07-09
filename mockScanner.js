const mockProfiles = [
  {
    riskRating: 'High',
    keywords: ['password', 'api_key', 'api key', 'secret', 'token', 'ssn', 'nric'],
    explanation: 'We detected highly sensitive credentials or secrets. Sharing this information could expose accounts, systems, or identity data.',
    suggestions: [
      'Mask the secret value with [REDACTED]',
      'Remove the secret from the text entirely',
      'Use environment variables or a secure vault instead'
    ],
    educationalTip: 'Never hardcode passwords, API keys, tokens, or national IDs in shared text or prompts.'
  },
  {
    riskRating: 'Medium',
    keywords: ['email', 'phone', 'phone number', 'address', 'student id'],
    explanation: 'This text contains personal contact or identity data that should not be shared publicly without consent.',
    suggestions: [
      'Redact contact details before sharing',
      'Replace the phone/email with a generic placeholder',
      'Keep personal identifiers out of public examples'
    ],
    educationalTip: 'Use placeholders like [EMAIL] or [PHONE] when sending examples or prompts that contain personal data.'
  },
  {
    riskRating: 'Low',
    keywords: [],
    explanation: 'Your content looks safe for a general student review.',
    suggestions: [
      'Mask personal details before sharing',
      'Remove direct contact information',
      'Avoid pasting API keys and passwords'
    ],
    educationalTip: 'Keep sensitive data out of shared documents and use redaction when you need to share screenshots or code snippets.'
  }
];

export function createMockAnalysis(input = '') {
  const normalized = String(input || '').toLowerCase();

  for (const profile of mockProfiles) {
    if (profile.keywords.length === 0) {
      continue;
    }

    const containsKeyword = profile.keywords.some((keyword) => normalized.includes(keyword));
    if (containsKeyword) {
      return {
        riskRating: profile.riskRating,
        explanation: profile.explanation,
        suggestions: profile.suggestions,
        educationalTip: profile.educationalTip
      };
    }
  }

  const lowProfile = mockProfiles.find((profile) => profile.riskRating === 'Low');
  return {
    riskRating: lowProfile.riskRating,
    explanation: lowProfile.explanation,
    suggestions: lowProfile.suggestions,
    educationalTip: lowProfile.educationalTip
  };
}
