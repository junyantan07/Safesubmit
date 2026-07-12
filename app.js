const BOTPRESS_CHAT_API_URL =
  'https://chat.botpress.cloud/0648d88e-93af-4b95-a50e-f1d6d7306992'; 

const { useState, useEffect, useRef } = React;
const e = React.createElement;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (payload.summary) {
    return typeof payload.summary === 'string'
      ? payload.summary
      : JSON.stringify(payload.summary, null, 2);
  }
  if (payload.evaluation) {
    return typeof payload.evaluation === 'string'
      ? payload.evaluation
      : JSON.stringify(payload.evaluation, null, 2);
  }
  if (payload.type === 'choice' && payload.text) return payload.text;
  if (payload.text) return payload.text;
  if (payload.title || payload.subtitle) {
    return [payload.title, payload.subtitle].filter(Boolean).join('\n');
  }
  return JSON.stringify(payload, null, 2);
}

function extractBotpressStatus(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const statusValue =
    payload.status ||
    payload.severity ||
    payload.risk ||
    payload.outcome ||
    payload.evaluation ||
    '';

  return String(statusValue).trim();
}

function buildBotpressReply(message) {
  const payload = message.payload || {};
  const text = formatPayload(payload) || String(message.text || '').trim();
  // Clean empty status prevents automatic hardcoded "Low Risk" tags on friendly greetings
  const status = extractBotpressStatus(payload) || '';

  return {
    id: message.id,
    text,
    payload,
    status,
  };
}

function getReplyOptions(reply) {
  if (
    reply &&
    reply.payload &&
    reply.payload.type === 'choice' &&
    Array.isArray(reply.payload.options)
  ) {
    return reply.payload.options;
  }

  return [];
}

function getBotpressChoiceValue(value) {
  return value === 'files (txt, md)' ? 'plaintext' : value;
}

function adaptRepliesForChannel(replies, channel) {
  if (channel !== 'files (txt, md)') return replies;

  return replies.map((reply) => {
    if (!reply.text.toLowerCase().includes('enter or paste the text')) {
      return reply;
    }

    return {
      ...reply,
      text:
        'Upload a TXT/Markdown file or paste its text here to begin the check.',
    };
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsText(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be loaded.'));
    image.src = dataUrl;
  });
}

async function prepareImageDataUrl(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.86);
}

function classifyBotState(replies) {
  const allText = replies.map((reply) => reply.text).join('\n').toLowerCase();
  const choiceReply = replies
    .slice()
    .reverse()
    .find((reply) => getReplyOptions(reply).length > 0);

  if (allText.includes('enter or paste the text')) {
    return {
      workflowStep: 'send_content',
      choices: [],
    };
  }

  if (
    allText.includes('upload or paste the image') ||
    allText.includes('enter your text or upload a markdown') ||
    allText.includes('upload a txt/markdown file')
  ) {
    return {
      workflowStep: 'send_content',
      choices: [],
    };
  }

  if (choiceReply) {
    return {
      workflowStep: 'choose_option',
      choices: getReplyOptions(choiceReply),
    };
  }

  return {
    workflowStep: 'idle',
    choices: [],
  };
}

async function botpressRequest(route, options = {}) {
  const headers = {
    Accept: 'application/json, text/plain, */*',
    ...(options.headers || {}),
  };
  let body = options.body;

  if (body && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(`${BOTPRESS_CHAT_API_URL}${route}`, {
    method: options.method || 'GET',
    headers,
    body,
  });
  const raw = await response.text();
  let json = null;

  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      (json && json.message) ||
        raw ||
        `${response.status} ${response.statusText}`,
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
    raw,
    json,
  };
}

async function createBotpressSession() {
  const userResult = await botpressRequest('/users', {
    method: 'POST',
    body: {},
  });
  const user = userResult.json && userResult.json.user;
  const userKey = userResult.json && userResult.json.key;

  if (!user || !userKey) {
    throw new Error('Botpress did not return a chat user key.');
  }

  const conversationResult = await botpressRequest('/conversations', {
    method: 'POST',
    headers: {
      'x-user-key': userKey,
    },
    body: {},
  });
  const conversation =
    conversationResult.json && conversationResult.json.conversation;

  if (!conversation) {
    throw new Error('Botpress did not return a conversation.');
  }

  return {
    userId: user.id,
    userKey,
    conversationId: conversation.id,
    seenMessageIds: new Set(),
  };
}

async function listMessages(session) {
  const result = await botpressRequest(
    `/conversations/${session.conversationId}/messages`,
    {
      headers: {
        'x-user-key': session.userKey,
      },
    },
  );

  return (result.json && result.json.messages) || [];
}

function findNewBotReplies(messages, session, collectedIds = new Set()) {
  return messages
    .slice()
    .reverse()
    .filter((message) => {
      const isNew = !session.seenMessageIds.has(message.id);
      const isUncollected = !collectedIds.has(message.id);
      const isBot = message.userId !== session.userId;
      return isNew && isUncollected && isBot;
    })
    .map((message) => buildBotpressReply(message))
    .filter((message) => message.text);
}

async function pollBotReplies(session, options = {}) {
  const attempts = options.attempts || 1;
  const delayMs = options.delayMs || 1000;
  const settleAttempts = options.settleAttempts || 0;
  const collectedIds = new Set();
  let remainingSettleAttempts = settleAttempts;
  let messages = [];
  const replies = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await wait(delayMs);
    messages = await listMessages(session);
    const newReplies = findNewBotReplies(messages, session, collectedIds);

    if (newReplies.length > 0) {
      for (const reply of newReplies) {
        collectedIds.add(reply.id);
        replies.push(reply);
      }
      remainingSettleAttempts = settleAttempts;
      continue;
    }

    if (replies.length > 0) {
      if (remainingSettleAttempts <= 0) break;
      remainingSettleAttempts -= 1;
    }
  }

  for (const message of messages) {
    if (message.id) session.seenMessageIds.add(message.id);
  }

  return replies;
}

async function sendBotpressPayload(session, payload, pollOptions = {}) {
  const sent = await botpressRequest('/messages', {
    method: 'POST',
    headers: {
      'x-user-key': session.userKey,
    },
    body: {
      conversationId: session.conversationId,
      payload,
    },
  });

  const sentMessage = sent.json && sent.json.message;
  if (sentMessage && sentMessage.id) {
    session.seenMessageIds.add(sentMessage.id);
  }

  return pollBotReplies(session, {
    attempts: 45,
    delayMs: 1000,
    settleAttempts: 3,
    ...pollOptions,
  });
}

async function sendBotpressMessage(session, text, pollOptions = {}) {
  return sendBotpressPayload(session, {
    type: 'text',
    text,
  }, pollOptions);
}

async function sendBotpressImage(session, imageUrl, pollOptions = {}) {
  return sendBotpressPayload(session, {
    type: 'image',
    imageUrl,
  }, pollOptions);
}

function TypingDots() {
  return e(
    'span',
    { className: 'typing-dots' },
    e('span', null),
    e('span', null),
    e('span', null),
  );
}

function App() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowStep, setWorkflowStep] = useState('connecting');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [availableChoices, setAvailableChoices] = useState([]);
  const [fileToConfirm, setFileToConfirm] = React.useState(null);

  const chatEndRef = useRef(null);
  const sessionRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isLoading]);

  // Auto-grow the textarea like ChatGPT/Gemini composers do
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [chatInput]);

  function appendBotReplies(replies) {
    if (!replies.length) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'Message sent. Botpress did not return a visible reply yet.',
          options: [],
        },
      ]);
      return;
    }

    setChatHistory((prev) => [
      ...prev,
      ...replies.map((reply) => ({
        role: 'bot',
        text: reply.text,
        status: reply.status,
        options: getReplyOptions(reply),
      })),
    ]);

    const nextState = classifyBotState(replies);
    setWorkflowStep(nextState.workflowStep);
    setAvailableChoices(nextState.choices);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsLoading(true);
      setWorkflowStep('connecting');

      try {
        const session = await createBotpressSession();
        if (cancelled) return;
        sessionRef.current = session;

        const replies = await sendBotpressMessage(session, 'hi');
        if (cancelled) return;
        appendBotReplies(replies);
      } catch (error) {
        if (cancelled) return;
        setWorkflowStep('idle');
        setChatHistory([
          {
            role: 'bot',
            text: `Botpress connection error: ${error.message}`,
            options: [],
          },
        ]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChoiceSelect = async function (choice) {
    if (isLoading || !sessionRef.current) return;

    const value = choice.value || choice.label;
    const label = choice.label || value;

    if (['plaintext', 'files (txt, md)', 'images'].includes(value)) {
      setSelectedChannel(value);
    }

    setChatHistory((prev) => [...prev, { role: 'user', text: label }]);
    setAvailableChoices([]);
    setIsLoading(true);

    try {
      const botpressValue = getBotpressChoiceValue(value);
      const replies = await sendBotpressMessage(sessionRef.current, botpressValue);
      appendBotReplies(adaptRepliesForChannel(replies, value));
    } catch (error) {
      setWorkflowStep('idle');
      setChatHistory((prev) => [
        ...prev,
        { role: 'bot', text: `Botpress routing error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPayload = async function (targetPayload, displayText, payloadType = 'text') {
    if (!targetPayload || isLoading || !sessionRef.current) return;

    setChatHistory((prev) => [
      ...prev,
      { role: 'user', text: displayText || targetPayload },
    ]);
    setChatInput('');
    setIsLoading(true);

    try {
      const scanPollOptions = {
        attempts: 90,
        delayMs: 1000,
        settleAttempts: 15,
      };
      let replies;
      if (payloadType === 'image') {
        replies = await sendBotpressImage(sessionRef.current, targetPayload, scanPollOptions);
      } else {
        replies = await sendBotpressMessage(sessionRef.current, targetPayload, scanPollOptions);
      }
      appendBotReplies(replies);
    } catch (error) {
      setWorkflowStep('idle');
      setChatHistory((prev) => [
        ...prev,
        { role: 'bot', text: `ScanCore routing error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendContent = async function () {
    const targetPayload = chatInput.trim();
    if (!targetPayload) return;
    if (selectedChannel === 'images') {
      await handleSendPayload(targetPayload, undefined, 'image');
      return;
    }

    if (selectedChannel === 'files (txt, md)') {
      await handleSendPayload(targetPayload, targetPayload, 'text');
      return;
    }

    await handleSendPayload(targetPayload, undefined, 'text');
  };

  const handleFileSelect = async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file || isLoading) return;

    const isImage = selectedChannel === 'images';
    setFileToConfirm({ file, isImage });
    return;
  };

  const handleConfirmUpload = async () => {
    if (!fileToConfirm) return;
    const { file, isImage } = fileToConfirm;
    setFileToConfirm(null);
    try {
      const result = isImage ? await prepareImageDataUrl(file) : await readFileAsText(file);
      await handleSendPayload(result, `Uploaded file: ${file.name}`, isImage ? 'image' : 'text');
    } catch (err) {
      setChatHistory((p) => [...p, { role: 'bot', text: `Error: ${err.message}` }]);
    }
  };

  const handleCancelUpload = function () {
    setFileToConfirm(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && workflowStep === 'send_content') {
      event.preventDefault();
      handleSendContent();
    }
  };

  const handleRestart = async () => {
    if (isLoading || !sessionRef.current) return;
    setChatHistory([]);
    setAvailableChoices([]);
    setSelectedChannel('');
    setIsLoading(true);
    try {
      sessionRef.current = await createBotpressSession();
      appendBotReplies(await sendBotpressMessage(sessionRef.current, 'hi'));
    } catch (error) {
      setChatHistory([
        { role: 'bot', text: `Botpress connection error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const showUploadButton =
    workflowStep === 'send_content' &&
    !fileToConfirm &&
    (selectedChannel === 'images' || selectedChannel === 'files (txt, md)');

  return e(
    'div',
    { className: 'chatbot-container' },

    // Header
    e('header', { className: 'chatbot-header' },
      e('div', null,
        e('h2', { style: { margin: 0, fontSize: '1.2rem' } }, 'SafeSubmit'),
        e('p', { style: { margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' } }, 'ScanCore privacy check')
      ),
      e('span', { className: `chatbot-status${isLoading ? ' status-processing' : ''}` }, isLoading ? 'Scanning' : 'Online')
    ),

    // Messages
    e('div', { className: 'chatbot-messages' },
      chatHistory.map((msg, index) =>
        e('div', { key: index, className: `chatbot-message-row ${msg.role}` },
          msg.role === 'bot' && e('div', { className: 'row-avatar' }, e('img', { src: 'brand-icon-img.png', alt: 'SafeSubmit avatar', className: 'bot-avatar-img' })),
          e('div', { className: 'chatbot-bubble' },
            msg.role === 'bot' && e('div', { className: 'agent-name-header' }, 'SafeSubmit AI'),
            e('p', null, msg.text),
            // Security verdict assessment status pill renders underneath the description only when present
            msg.status && e('div', { className: 'result-status-chip' }, msg.status)
          )
        )
      ),
      isLoading && e('div', { className: 'chatbot-message-row bot' },
        e('div', { className: 'row-avatar' }, e('img', { src: 'brand-icon-img.png', alt: 'SafeSubmit avatar', className: 'bot-avatar-img' })),
        e('div', { className: 'chatbot-bubble loading' }, e(TypingDots))
      ),
      e('div', { ref: chatEndRef })
    ),

    // Footer / composer
    e('footer', { className: 'chatbot-footer' },
      workflowStep === 'send_content' ? (
        e('div', { className: 'content-entry-panel' },
          fileToConfirm ? (
            e('div', { className: 'upload-confirm-panel' },
              e('p', { className: 'confirm-text' }, `Are you sure you want to upload "${fileToConfirm.file.name}" for security analysis?`),
              e('div', { className: 'confirm-actions' },
                e('button', { className: 'cta-button primary confirm-yes', onClick: handleConfirmUpload, disabled: isLoading }, 'Yes, Scan File'),
                e('button', { className: 'choice-btn confirm-no', onClick: handleCancelUpload, disabled: isLoading }, 'Cancel')
              )
            )
          ) : (
            e('div', null,
              e('input', {
                ref: fileInputRef,
                type: 'file',
                accept:
                  selectedChannel === 'images'
                    ? 'image/*'
                    : '.txt,.md,text/plain,text/markdown',
                onChange: handleFileSelect,
                disabled: isLoading,
                style: { display: 'none' },
              }),
              e('div', { className: 'chatbot-input-area' },
                showUploadButton &&
                  e('button', {
                    className: 'icon-btn',
                    title: selectedChannel === 'images' ? 'Upload image' : 'Upload TXT/MD file',
                    onClick: () => fileInputRef.current && fileInputRef.current.click(),
                    disabled: isLoading,
                    type: 'button',
                  }, '📎'),
                e('textarea', {
                  ref: textareaRef,
                  value: chatInput,
                  onChange: (event) => setChatInput(event.target.value),
                  onKeyDown: handleKeyDown,
                  placeholder:
                    selectedChannel === 'images'
                      ? 'Paste an image URL or data URL...'
                      : `Message SafeSubmit about ${selectedChannel || 'your content'}...`,
                  rows: 1,
                }),
                e('button', {
                  className: 'chatbot-send-button',
                  onClick: handleSendContent,
                  disabled: !chatInput.trim() || isLoading,
                  title: 'Send',
                  type: 'button',
                }, '↑')
              )
            )
          )
        )
      ) : availableChoices.length > 0 ? (
        e('div', { className: 'choices-panel' },
          availableChoices.map((option) =>
            e('button', {
              key: option.value || option.label,
              className: 'choice-btn',
              onClick: () => handleChoiceSelect(option),
              disabled: isLoading,
            }, option.label || option.value)
          )
        )
      ) : (
        e('div', { className: 'choices-panel' },
          e('button', {
            className: 'choice-btn',
            onClick: handleRestart,
          }, 'Start New Scan')
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));