// Target profiles: what a well-formed prompt looks like for each destination.
export const TARGETS = {
  'claude-code': {
    label: 'Claude Code / coding agent',
    sections: ['Goal', 'Context', 'Constraints', 'Verification', 'Output format'],
    guidance:
      'The prompt drives a coding agent. Goal = the change wanted. Context = repo/stack facts from the source. ' +
      'Constraints = scope limits and rules. Verification = how the agent should prove the change works ' +
      '(only if the source implies it). Output format = what to deliver.',
  },
  chat: {
    label: 'Chat assistant',
    sections: ['Task', 'Context', 'Constraints', 'Output format'],
    guidance:
      'The prompt is pasted into a chat assistant. Task = what to produce. Context = audience and background. ' +
      'Constraints = tone, length, exclusions. Output format = structure of the reply.',
  },
  api: {
    label: 'LLM API call',
    sections: ['System', 'User', 'Output format'],
    guidance:
      'The prompt becomes an API call. System = stable role and rules. User = the specific request with its data. ' +
      'Output format = exact machine-readable shape expected.',
  },
  image: {
    label: 'Image generation',
    sections: ['Subject', 'Style', 'Composition', 'Avoid'],
    guidance:
      'The prompt drives an image model. Subject = what is depicted. Style = medium, era, artist-free style words. ' +
      'Composition = framing, lighting. Avoid = negative prompt items. Never invent visual details not implied by the source.',
  },
};
