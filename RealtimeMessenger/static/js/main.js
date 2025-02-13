let selectedUser = null;
let lastMessageTimestamp = null;

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createMessageElement(message) {
    const div = document.createElement('div');
    const isOwnMessage = message.sender_id === currentUserId;
    div.className = `message ${isOwnMessage ? 'sent' : 'received'}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const username = document.createElement('div');
    username.className = 'message-username';
    username.textContent = isOwnMessage ? 'you' : message.sender_username;

    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = message.content;

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(message.timestamp);

    messageContent.appendChild(username);
    messageContent.appendChild(text);
    messageContent.appendChild(time);
    div.appendChild(messageContent);

    return div;
}

async function loadMessages() {
    if (!selectedUser) return;

    const response = await fetch(`/api/messages/${selectedUser}`);
    const messages = await response.json();

    const messagesContainer = document.querySelector('.messages');
    messagesContainer.innerHTML = '';
    messages.forEach(message => {
        messagesContainer.appendChild(createMessageElement(message));
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    lastMessageTimestamp = messages.length > 0 ? messages[messages.length - 1].timestamp : null;
}

async function sendMessage(event) {
    event.preventDefault();
    if (!selectedUser) {
        alert('Please select a user to chat with');
        return;
    }

    const input = document.querySelector('.message-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient_id: selectedUser,
                content: content
            })
        });

        if (response.ok) {
            const message = await response.json();
            const messagesContainer = document.querySelector('.messages');
            messagesContainer.appendChild(createMessageElement(message));
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            input.value = '';
        } else {
            console.error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function selectUser(userId) {
    selectedUser = userId;
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.toggle('active', item.dataset.userId === userId);
    });
    loadMessages();
}

async function updateUserStatus() {
    try {
        const response = await fetch('/api/users/status');
        const users = await response.json();
        updateUserList(users);
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

function updateUserList(users) {
    const userList = document.querySelector('.user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const li = document.createElement('li');
        li.className = `user-item ${selectedUser === user.id ? 'active' : ''}`;
        li.innerHTML = `
            <div class="status-indicator ${user.online ? 'online' : ''}"></div>
            <span>${user.username}</span>
        `;
        li.onclick = () => selectUser(user.id);
        userList.appendChild(li);
    });
}

function initializeChat() {
    const messageForm = document.querySelector('.message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage);
    }

    setInterval(() => {
        if (selectedUser) {
            loadMessages();
        }
        updateUserStatus();
    }, 5000);

    updateUserStatus();
}

document.addEventListener('DOMContentLoaded', initializeChat);