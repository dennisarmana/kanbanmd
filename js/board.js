/**
 * Kanban board rendering and interaction functionality
 */

/**
 * Render the kanban board with columns and cards
 * @param {HTMLElement} container - Container element to render the board in
 * @param {Array} columns - Array of column objects with their cards
 */
function renderKanbanBoard(container, columns) {
  // Clear the container
  container.innerHTML = '';
  
  // Create and append each column
  columns.forEach((column, columnIndex) => {
    const columnElement = createColumnElement(column, columnIndex);
    container.appendChild(columnElement);
  });
  
  // Initialize drag and drop functionality
  initDragAndDrop();
  
  // Add button to go back to file selection
  addControlButtons(container);
}

/**
 * Create a column element with header and cards
 * @param {Object} column - Column data object
 * @param {number} columnIndex - Index of the column
 * @returns {HTMLElement} The created column element
 */
function createColumnElement(column, columnIndex) {
  const columnElement = document.createElement('div');
  columnElement.className = 'kanban-column';
  columnElement.dataset.columnIndex = columnIndex;
  
  // Create column header
  const headerElement = document.createElement('div');
  headerElement.className = 'column-header';
  headerElement.textContent = column.title;
  columnElement.appendChild(headerElement);
  
  // Create cards container
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'cards-container';
  columnElement.appendChild(cardsContainer);
  
  // Add cards to the column
  column.cards.forEach((card, cardIndex) => {
    const cardElement = createCardElement(card, cardIndex, columnIndex);
    cardsContainer.appendChild(cardElement);
  });
  
  // Add "Add Card" button
  const addButton = document.createElement('button');
  addButton.className = 'add-card-btn';
  addButton.textContent = '+ Add Card';
  addButton.addEventListener('click', () => handleAddCard(columnIndex));
  columnElement.appendChild(addButton);
  
  return columnElement;
}

/**
 * Create a card element
 * @param {Object} card - Card data object
 * @param {number} cardIndex - Index of the card in its column
 * @param {number} columnIndex - Index of the column containing the card
 * @returns {HTMLElement} The created card element
 */
function createCardElement(card, cardIndex, columnIndex) {
  // Ensure we have valid card data
  if (!card) {
    console.error('Invalid card data for column', columnIndex, 'index', cardIndex);
    card = { text: 'New Card', completed: false };
  }
  
  const cardElement = document.createElement('div');
  cardElement.className = 'kanban-card';
  cardElement.dataset.cardIndex = cardIndex;
  cardElement.dataset.columnIndex = columnIndex;
  cardElement.draggable = false; // Only enable dragging via the handle
  
  // Create drag handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '&#8942;&#8942;';
  dragHandle.title = 'Drag to move card';
  
  // Create card content container
  const cardContent = document.createElement('div');
  cardContent.className = 'card-content';
  
  // Create checkbox container
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  
  // Create checkbox for completion status
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = !!card.completed; // Ensure boolean with !! operator
  checkbox.addEventListener('change', () => {
    try {
      // Update the data model when checkbox is toggled
      const boardData = getBoardDataFromDOM();
      // Make sure we're accessing valid data
      if (boardData[columnIndex] && boardData[columnIndex].cards && boardData[columnIndex].cards[cardIndex]) {
        boardData[columnIndex].cards[cardIndex].completed = checkbox.checked;
        cardElement.classList.toggle('completed', checkbox.checked);
        saveBoard(boardData);
      }
    } catch (error) {
      console.error('Error updating checkbox state:', error);
    }
  });
  
  // Create text content
  const textSpan = document.createElement('span');
  textSpan.className = 'card-text';
  textSpan.textContent = card.text || 'New Card'; // Ensure we have text
  
  // Add double-click to edit
  textSpan.addEventListener('dblclick', () => {
    try {
      handleEditCard(textSpan, columnIndex, cardIndex);
    } catch (error) {
      console.error('Error handling edit:', error);
    }
  });
  
  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-card-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.title = 'Delete card';
  deleteBtn.addEventListener('click', () => {
    handleDeleteCard(columnIndex, cardIndex);
  });
  
  // Append elements in proper order
  checkboxContainer.appendChild(checkbox);
  cardContent.appendChild(checkboxContainer);
  cardContent.appendChild(textSpan);
  
  // Add elements to card
  cardElement.appendChild(dragHandle);
  cardElement.appendChild(cardContent);
  cardElement.appendChild(deleteBtn);
  
  // Add completed class if needed
  if (card.completed) {
    cardElement.classList.add('completed');
  }
  
  return cardElement;
}

/**
 * Initialize drag and drop functionality for cards
 */
function initDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.cards-container');
  
  // Track the currently dragged card to prevent multiple selections
  let currentlyDragging = null;
  
  // Add drag events to cards
  cards.forEach(card => {
    // Make drag handle the trigger for drag operation
    const dragHandle = card.querySelector('.drag-handle');
    
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        // Only allow one card to be draggable at a time
        if (!currentlyDragging) {
          card.draggable = true;
          currentlyDragging = card;
          // Stop event from bubbling up to prevent issues
          e.stopPropagation();
        }
      });
    }
    
    // Reset draggable state when mouse leaves the card
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('dragging')) {
        card.draggable = false;
      }
    });
    
    // Handle dragstart and dragend events
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
  });
  
  // Add drop events to columns
  columns.forEach(column => {
    column.addEventListener('dragover', dragOver);
    column.addEventListener('dragenter', dragEnter);
    column.addEventListener('dragleave', dragLeave);
    column.addEventListener('drop', drop);
  });
  
  // Reset draggable state for all cards when mouse is clicked elsewhere
  document.addEventListener('mousedown', (e) => {
    // Check if click is outside of a drag handle
    if (!e.target.closest('.drag-handle')) {
      resetDraggableState();
    }
  });
  
  // Reset all cards' draggable state
  function resetDraggableState() {
    currentlyDragging = null;
    document.querySelectorAll('.kanban-card').forEach(c => {
      c.draggable = false;
    });
  }
  
  // Drag functions
  function dragStart(e) {
    // Only one card should be draggable at a time
    document.querySelectorAll('.kanban-card').forEach(card => {
      if (card !== this) {
        card.draggable = false;
      }
    });
    
    this.classList.add('dragging');
    
    // Set a ghost drag image
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      // Set delay to ensure proper ghost image
      setTimeout(() => {
        this.classList.add('ghost');
      }, 0);
    }
  }
  
  function dragEnd() {
    this.classList.remove('dragging');
    this.classList.remove('ghost');
    this.draggable = false;
    currentlyDragging = null;
    
    // Force a small delay before allowing dragging again to prevent glitches
    setTimeout(() => {
      document.querySelectorAll('.kanban-card').forEach(card => {
        card.draggable = false;
      });
    }, 50);
  }
  
  function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Get dragged card
    const draggedCard = document.querySelector('.dragging');
    if (!draggedCard) return;
    
    // Find closest card to insert before
    const cards = [...this.querySelectorAll('.kanban-card:not(.dragging)')];
    const closestCard = findClosestCard(e.clientY, cards);
    
    // Insert dragged card in the right position
    if (closestCard) {
      this.insertBefore(draggedCard, closestCard);
    } else {
      this.appendChild(draggedCard);
    }
  }
  
  function findClosestCard(clientY, cards) {
    // Find the closest card based on mouse position
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = clientY - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: card };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  function dragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
  }
  
  function dragLeave() {
    this.classList.remove('drag-over');
  }
  
  function drop() {
    this.classList.remove('drag-over');
    
    try {
      // Get the dragged card
      const draggedCard = document.querySelector('.dragging');
      if (!draggedCard) return;
      
      // Get a fresh copy of the board data
      const boardData = getBoardDataFromDOM();
      
      // Get the source and target indices
      // These might be stale since the DOM may have changed, so we get them from scratch
      const sourceColumnElement = draggedCard.closest('.kanban-column');
      const targetColumnElement = this.closest('.kanban-column');
      
      if (!sourceColumnElement || !targetColumnElement) {
        console.error('Could not find column elements');
        return;
      }
      
      // Get the actual index based on DOM position, not dataset
      const sourceColumnIndex = Array.from(document.querySelectorAll('.kanban-column')).indexOf(sourceColumnElement);
      const targetColumnIndex = Array.from(document.querySelectorAll('.kanban-column')).indexOf(targetColumnElement);
      
      if (sourceColumnIndex < 0 || targetColumnIndex < 0) {
        console.error('Invalid column indices', sourceColumnIndex, targetColumnIndex);
        return;
      }
      
      // Get the card indices
      const sourceCardElements = sourceColumnElement.querySelectorAll('.kanban-card');
      const sourceCardIndex = Array.from(sourceCardElements).indexOf(draggedCard);
      
      if (sourceCardIndex < 0 || !boardData[sourceColumnIndex] || !boardData[sourceColumnIndex].cards[sourceCardIndex]) {
        console.error('Invalid card index or data', sourceCardIndex);
        return;
      }
      
      // Get the actual card data
      const cardData = {
        text: draggedCard.querySelector('.card-text')?.textContent || 'New Card',
        completed: draggedCard.querySelector('input[type="checkbox"]')?.checked || false
      };
      
      // Get target position based on DOM order - where the card should be inserted
      const targetCardIndex = findCardPositionInColumn(draggedCard, this);
      
      // Remove card from source column
      boardData[sourceColumnIndex].cards.splice(sourceCardIndex, 1);
      
      // Make sure the target column has a cards array
      if (!boardData[targetColumnIndex].cards) {
        boardData[targetColumnIndex].cards = [];
      }
      
      // Add card to target column at correct position
      boardData[targetColumnIndex].cards.splice(targetCardIndex, 0, cardData);
      
      // Re-render board with updated data
      renderKanbanBoard(document.getElementById('board-container'), boardData);
      
      // Save the updated board
      saveBoard(boardData);
    } catch (error) {
      console.error('Error during drag and drop:', error);
      // If anything goes wrong, just refresh the board
      renderKanbanBoard(document.getElementById('board-container'), getBoardDataFromDOM());
    } finally {
      // Always reset drag state
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      document.querySelectorAll('.ghost').forEach(el => el.classList.remove('ghost'));
    }
  }
  
  /**
   * Find the position where a card should be inserted in a column
   * @param {HTMLElement} draggedCard - The card being dragged
   * @param {HTMLElement} targetColumn - The column to insert into
   * @returns {number} The position to insert at
   */
  function findCardPositionInColumn(draggedCard, targetColumn) {
    const cards = [...targetColumn.querySelectorAll('.kanban-card')];
    const draggedCardIndex = cards.indexOf(draggedCard);
    
    // If the card is not found, add to the end
    if (draggedCardIndex === -1) return cards.length;
    
    return draggedCardIndex;
  }
}

/**
 * Handle adding a new card to a column
 * @param {number} columnIndex - Index of the column to add card to
 */
function handleAddCard(columnIndex) {
  const boardData = getBoardDataFromDOM();
  
  // Create new card with default text
  boardData[columnIndex].cards.push({
    text: 'New Card',
    completed: false
  });
  
  // Re-render the board
  renderKanbanBoard(document.getElementById('board-container'), boardData);
  
  // Save the updated board
  saveBoard(boardData);
}

/**
 * Handle editing a card's text
 * @param {HTMLElement} textElement - The text element to edit
 * @param {number} columnIndex - Index of the column containing the card
 * @param {number} cardIndex - Index of the card to edit
 */
function handleEditCard(textElement, columnIndex, cardIndex) {
  const currentText = textElement.textContent;
  const cardContent = textElement.closest('.card-content');
  
  // Use a textarea instead of input for better multiline editing
  const textarea = document.createElement('textarea');
  textarea.value = currentText;
  textarea.className = 'edit-card-input';
  textarea.rows = Math.max(1, (currentText.match(/\n/g) || []).length + 1);
  
  // Set the width based on the card's content area
  if (cardContent) {
    const width = cardContent.clientWidth - 40; // account for padding
    textarea.style.width = width + 'px';
  }
  
  // Replace text with textarea
  textElement.parentNode.replaceChild(textarea, textElement);
  textarea.focus();
  
  // Select all text initially for easy replacement
  textarea.setSelectionRange(0, textarea.value.length);
  
  // Auto-resize the textarea based on content
  function adjustHeight() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(200, textarea.scrollHeight) + 'px';
  }
  
  textarea.addEventListener('input', adjustHeight);
  adjustHeight(); // Initial adjustment
  
  // Handle saving changes when done editing
  function saveEdit() {
    const newText = textarea.value.trim() || 'New Card';
    
    // Update text element
    textElement.textContent = newText;
    textarea.parentNode.replaceChild(textElement, textarea);
    
    // Update data model
    try {
      const boardData = getBoardDataFromDOM();
      if (boardData[columnIndex] && boardData[columnIndex].cards && boardData[columnIndex].cards[cardIndex]) {
        boardData[columnIndex].cards[cardIndex].text = newText;
        saveBoard(boardData);
      }
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  }
  
  // Handle clicking outside the textarea
  textarea.addEventListener('blur', saveEdit);
  
  // Handle keyboard shortcuts
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter without shift saves the edit
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      // Escape cancels editing
      textElement.parentNode.replaceChild(textElement, textarea);
    }
  });
}

/**
 * Handle deleting a card
 * @param {number} columnIndex - Index of the column containing the card
 * @param {number} cardIndex - Index of the card to delete
 */
function handleDeleteCard(columnIndex, cardIndex) {
  if (confirm('Are you sure you want to delete this card?')) {
    // Get current board data
    const boardData = getBoardDataFromDOM();
    
    // Remove the card
    boardData[columnIndex].cards.splice(cardIndex, 1);
    
    // Re-render the board
    renderKanbanBoard(document.getElementById('board-container'), boardData);
    
    // Save the updated board
    saveBoard(boardData);
  }
}

/**
 * Extract board data from the current DOM structure
 * @returns {Array} Array of column objects with their cards
 */
function getBoardDataFromDOM() {
  const columns = document.querySelectorAll('.kanban-column');
  const boardData = [];
  
  columns.forEach((column, index) => {
    // Use the actual index rather than dataset value which might be incorrect after reordering
    const headerElement = column.querySelector('.column-header');
    const cardElements = column.querySelectorAll('.kanban-card');
    
    const columnData = {
      title: headerElement ? headerElement.textContent : `Column ${index + 1}`,
      cards: []
    };
    
    cardElements.forEach(card => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      const textSpan = card.querySelector('.card-text');
      
      // Ensure we have valid data
      if (textSpan) {
        columnData.cards.push({
          text: textSpan.textContent || 'New card',
          completed: checkbox ? checkbox.checked : false
        });
      }
    });
    
    boardData[index] = columnData;
  });
  
  // Remove any undefined entries and ensure we have a contiguous array
  return boardData.filter(Boolean);
}

/**
 * Add control buttons to the board
 * @param {HTMLElement} container - The board container element
 */
function addControlButtons(container) {
  // First, remove any existing board controls to prevent duplication
  document.querySelectorAll('.board-controls').forEach(el => el.remove());
  
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'board-controls';
  controlsDiv.id = 'board-controls'; // Add an ID for easier selection
  
  // Back button
  const backButton = document.createElement('button');
  backButton.textContent = 'Back to File Selection';
  backButton.className = 'back-button';
  backButton.addEventListener('click', () => {
    document.getElementById('file-section').style.display = 'block';
    container.classList.add('hidden');
    // Also remove the controls when going back
    controlsDiv.remove();
  });
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Download Kanban.md';
  saveButton.className = 'save-button';
  saveButton.addEventListener('click', () => {
    downloadKanbanFile();
  });
  
  // Append buttons
  controlsDiv.appendChild(backButton);
  controlsDiv.appendChild(saveButton);
  
  // Add controls div before the board
  container.parentNode.insertBefore(controlsDiv, container);
}

/**
 * Save the current board state
 * @param {Array} boardData - Array of column objects with their cards
 */
function saveBoard(boardData) {
  // For now, we're just updating the UI
  // In a real implementation, this would sync with the file
  console.log('Board saved:', boardData);
  
  // TODO: Implement actual file synchronization
}

/**
 * Download the current kanban board as a markdown file
 */
function downloadKanbanFile() {
  const boardData = getBoardDataFromDOM();
  const markdown = generateMarkdown(boardData);
  
  // Create download link
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kanban.md';
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
