# Step 31: Chatbot Interface (Rowan Frontend)

## 1. The "Why" Behind This Step: The Digital Concierge

**Rowan** is your AI assistant. She lives in a chat bubble in the corner of the screen, ready to answer questions like "Where is my order?" or "Are you open on Sundays?"

**The Strategy**: A floating chat widget that communicates with the NestJS Chatbot Module (Step 16/18).
- **The Analogy**: Imagine a friendly helper who walks up to a customer and says, "Can I help you find something?"

---

## 2. Core Concepts & Definitions

### 2.1 Floating Action Button (FAB)
- **Definition**: A circular button that floats over the content (usually in the bottom-right corner).

### 2.2 Optimistic UI
- **The Logic**: When the user types a message, it appears in the chat window instantly, with a "Typing..." indicator while the AI processes the answer.

---

## 3. Step-by-Step Implementation

### Step 3.1: The Floating Chat Widget

**File**: `apps/web/src/app/components/Chat/ChatWidget.tsx`

```tsx
import { Fab, Paper, TextField, IconButton, Box, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import { useState } from 'react';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ text: "Hi! I'm Rowan. How can I help?", isBot: true }]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const userMsg = input;
    setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
    setInput('');
    
    // Call the API we built in Step 16
    const response = await fetch('/api/chatbot/message', { 
      method: 'POST', 
      body: JSON.stringify({ message: userMsg }) 
    });
    const data = await response.json();
    
    setMessages(prev => [...prev, { text: data.reply, isBot: true }]);
  };

  return (
    <>
      <Fab color="primary" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => setOpen(!open)}>
        <ChatIcon />
      </Fab>

      {open && (
        <Paper sx={{ position: 'fixed', bottom: 80, right: 16, width: 300, height: 400, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography>Chat with Rowan</Typography>
          </Box>
          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ textAlign: m.isBot ? 'left' : 'right', mb: 1 }}>
                <Typography variant="caption" sx={{ p: 1, bgcolor: m.isBot ? '#eee' : 'primary.light', borderRadius: '8px', display: 'inline-block' }}>
                  {m.text}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 1, display: 'flex' }}>
            <TextField fullWidth size="small" value={input} onChange={(e) => setInput(e.target.value)} />
            <IconButton onClick={handleSend} color="primary"><SendIcon /></IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
}
```

---

## 4. Checklist for Success
- [ ] **Interaction**: Can you open and close the chat?
- [ ] **API Connection**: Does Rowan actually respond with data from the backend?

---

**CONGRATULATIONS!** You have built the entire feature set for Sawdust & Scents. Now, we move to the final phase: **Security Hardening, Testing, and Cloud Deployment (Steps 32-34)**.
