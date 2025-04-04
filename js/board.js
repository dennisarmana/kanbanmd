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
  
  // Create text content with formatting support
  const textSpan = document.createElement('span');
  textSpan.className = 'card-text';
  // Use the formatCardText function to handle markdown formatting
  textSpan.innerHTML = formatCardText(card.text) || 'New Card';
  
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
  
  // Add metadata if available
  if (card.priority || card.dueDate || (card.tags && card.tags.length > 0)) {
    const metadataElement = document.createElement('div');
    metadataElement.className = 'card-metadata';
    
    // Add priority if available
    if (card.priority) {
      const priorityElement = document.createElement('span');
      priorityElement.className = `priority priority-${card.priority}`;
      priorityElement.textContent = card.priority.charAt(0).toUpperCase() + card.priority.slice(1);
      metadataElement.appendChild(priorityElement);
    }
    
    // Add due date if available
    if (card.dueDate) {
      const dueDateElement = document.createElement('span');
      dueDateElement.className = 'due-date';
      dueDateElement.textContent = `Due: ${card.dueDate}`;
      metadataElement.appendChild(dueDateElement);
    }
    
    // Add tags if available
    if (card.tags && card.tags.length > 0) {
      const tagsElement = document.createElement('div');
      tagsElement.className = 'tags-container';
      
      card.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = `#${tag}`;
        tagsElement.appendChild(tagElement);
      });
      
      metadataElement.appendChild(tagsElement);
    }
    
    cardContent.appendChild(metadataElement);
  }
  
  // Add multiline content if available
  if (card.content && card.content.trim().length > 0) {
    const contentElement = document.createElement('div');
    contentElement.className = 'card-extended-content';
    contentElement.innerHTML = card.content.split('\n').map(line => {
      // Check if line is a code block marker
      if (line.trim().startsWith('```')) {
        return `<div class="code-block-marker">${line}</div>`;
      }
      return `<div>${line}</div>`;
    }).join('');
    cardContent.appendChild(contentElement);
  }
  
  // Add subtasks if available
  if (card.subtasks && card.subtasks.length > 0) {
    const subtasksElement = createSubtasksElement(card.subtasks, columnIndex, cardIndex);
    cardContent.appendChild(subtasksElement);
  }
  
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
 * Create a subtasks container element
 * @param {Array} subtasks - Array of subtask objects
 * @param {number} columnIndex - Index of the column containing the parent card
 * @param {number} cardIndex - Index of the parent card
 * @returns {HTMLElement} The created subtasks element
 */
function createSubtasksElement(subtasks, columnIndex, cardIndex) {
  const subtasksElement = document.createElement('div');
  subtasksElement.className = 'subtasks-container';
  
  subtasks.forEach((subtask, subtaskIndex) => {
    const subtaskElement = document.createElement('div');
    subtaskElement.className = 'subtask';
    subtaskElement.style.marginLeft = `${subtask.indentation * 10}px`;
    
    // Create checkbox for subtask completion status
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'subtask-checkbox';
    checkbox.checked = !!subtask.completed;
    checkbox.addEventListener('change', () => {
      try {
        // Update the data model when checkbox is toggled
        const boardData = getBoardDataFromDOM();
        // Make sure we're accessing valid data
        if (boardData[columnIndex] && 
            boardData[columnIndex].cards && 
            boardData[columnIndex].cards[cardIndex] &&
            boardData[columnIndex].cards[cardIndex].subtasks &&
            boardData[columnIndex].cards[cardIndex].subtasks[subtaskIndex]) {
          
          boardData[columnIndex].cards[cardIndex].subtasks[subtaskIndex].completed = checkbox.checked;
          subtaskElement.classList.toggle('completed', checkbox.checked);
          saveBoard(boardData);
        }
      } catch (error) {
        console.error('Error updating subtask checkbox state:', error);
      }
    });
    
    // Create subtask text
    const textSpan = document.createElement('span');
    textSpan.className = 'subtask-text';
    textSpan.innerHTML = formatCardText(subtask.text);
    
    // Add elements to subtask
    subtaskElement.appendChild(checkbox);
    subtaskElement.appendChild(textSpan);
    
    // Add completed class if needed
    if (subtask.completed) {
      subtaskElement.classList.add('completed');
    }
    
    subtasksElement.appendChild(subtaskElement);
  });
  
  return subtasksElement;
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
  // Get either the original text from dataset (in case of formatted text)
  // or the actual textContent
  const currentText = textElement.dataset.originalText || textElement.textContent;
  
  // Hide the text element
  textElement.style.display = 'none';
  
  // Create a textarea for editing
  const textarea = document.createElement('textarea');
  textarea.className = 'card-edit-textarea';
  textarea.value = currentText;
  textarea.rows = Math.max(2, currentText.split('\n').length);
  
  // Function to resize textarea based on content
  const resizeTextarea = () => {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  };
  
  // Initial resize and add input event for dynamic resizing
  textarea.addEventListener('input', resizeTextarea);
  
  // Insert textarea after the text element
  textElement.parentNode.insertBefore(textarea, textElement.nextSibling);
  
  // Focus the textarea and place cursor at the end
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  resizeTextarea();
  
  // Create save and cancel buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'edit-buttons-container';
  
  const saveButton = document.createElement('button');
  saveButton.className = 'save-edit-btn';
  saveButton.textContent = 'Save';
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-edit-btn';
  cancelButton.textContent = 'Cancel';
  
  const helpButton = document.createElement('button');
  helpButton.className = 'help-markdown-btn';
  helpButton.textContent = '?';
  helpButton.title = 'Markdown Help';
  helpButton.addEventListener('click', () => {
    showMarkdownHelp();
  });
  
  buttonsContainer.appendChild(saveButton);
  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(helpButton);
  
  // Insert buttons after textarea
  textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
  
  // Function to save changes
  const saveChanges = () => {
    const newText = textarea.value.trim();
    if (newText !== '') {
      // Store the original text as a data attribute
      textElement.dataset.originalText = newText;
      // Display formatted text
      textElement.innerHTML = formatCardText(newText);
      
      // Update the data model
      const boardData = getBoardDataFromDOM();
      // Make sure we're accessing valid data
      if (boardData[columnIndex] && boardData[columnIndex].cards && boardData[columnIndex].cards[cardIndex]) {
        boardData[columnIndex].cards[cardIndex].text = newText;
        
        // Attempt to extract metadata like tags, priorities, due dates
        const card = boardData[columnIndex].cards[cardIndex];
        
        // Extract tags
        const tagRegex = /#([\w-]+)/g;
        const tags = [];
        let tagMatch;
        while ((tagMatch = tagRegex.exec(newText)) !== null) {
          tags.push(tagMatch[1]);
        }
        if (tags.length > 0) {
          card.tags = tags;
        }
        
        // Extract due date
        const dueDateRegex = /@due\((\d{4}-\d{2}-\d{2})\)/;
        const dueDateMatch = newText.match(dueDateRegex);
        if (dueDateMatch) {
          card.dueDate = dueDateMatch[1];
        }
        
        // Extract priority
        const priorityRegex = /!(high|medium|low)/i;
        const priorityMatch = newText.match(priorityRegex);
        if (priorityMatch) {
          card.priority = priorityMatch[1].toLowerCase();
        }
        
        saveBoard(boardData);
        
        // Re-render the board to reflect all changes
        renderKanbanBoard(document.getElementById('board-container'), boardData);
      }
    }
    cleanup();
  };
  
  // Function to cancel editing
  const cancelEdit = () => {
    cleanup();
  };
  
  // Function to clean up edit mode
  const cleanup = () => {
    textElement.style.display = '';
    textarea.remove();
    buttonsContainer.remove();
  };
  
  // Add event listeners to buttons
  saveButton.addEventListener('click', saveChanges);
  cancelButton.addEventListener('click', cancelEdit);
  
  // Handle keyboard shortcuts
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to save
      saveChanges();
    } else if (e.key === 'Escape') {
      // Escape to cancel
      cancelEdit();
    }
  });
}

/**
 * Show markdown help popup
 */
function showMarkdownHelp() {
  // Create the help content HTML using DOM methods instead of template literals to avoid syntax issues
  const helpContainer = document.createElement('div');
  
  // Add the title
  const title = document.createElement('h3');
  title.textContent = 'Markdown Formatting Help';
  helpContainer.appendChild(title);
  
  // Create the content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'markdown-help-content';
  
  // Basic Text Formatting section
  const formatTitle = document.createElement('p');
  formatTitle.innerHTML = '<strong>Basic Text Formatting:</strong>';
  contentDiv.appendChild(formatTitle);
  
  const formatList = document.createElement('ul');
  formatList.innerHTML = 
    '<li><code>**bold**</code> or <code>__bold__</code> &rarr; <strong>bold</strong></li>' +
    '<li><code>*italic*</code> or <code>_italic_</code> &rarr; <em>italic</em></li>' +
    '<li><code>`code`</code> &rarr; <code>code</code></li>';
  contentDiv.appendChild(formatList);
  
  // Links section
  const linksTitle = document.createElement('p');
  linksTitle.innerHTML = '<strong>Links:</strong>';
  contentDiv.appendChild(linksTitle);
  
  const linksList = document.createElement('ul');
  linksList.innerHTML = 
    '<li><code>[Link text](https://example.com)</code> &rarr; <a href="#">Link text</a></li>' +
    '<li>URLs are automatically linked: <code>https://example.com</code></li>';
  contentDiv.appendChild(linksList);
  
  // Card Metadata section
  const metadataTitle = document.createElement('p');
  metadataTitle.innerHTML = '<strong>Card Metadata:</strong>';
  contentDiv.appendChild(metadataTitle);
  
  const metadataList = document.createElement('ul');
  metadataList.innerHTML = 
    '<li><code>#tag</code> &rarr; Adds a tag to the card</li>' +
    '<li><code>!high</code>, <code>!medium</code>, <code>!low</code> &rarr; Sets card priority</li>' +
    '<li><code>@due(YYYY-MM-DD)</code> &rarr; Sets a due date</li>';
  contentDiv.appendChild(metadataList);
  
  // Subtasks section
  const subtasksTitle = document.createElement('p');
  subtasksTitle.innerHTML = '<strong>Subtasks:</strong>';
  contentDiv.appendChild(subtasksTitle);
  
  const subtasksDesc = document.createElement('p');
  subtasksDesc.textContent = 'Add indented list items after the main card text:';
  contentDiv.appendChild(subtasksDesc);
  
  const subtasksExample = document.createElement('pre');
  subtasksExample.textContent = 'Main card text\n  - [ ] Subtask 1\n  - [x] Completed subtask';
  contentDiv.appendChild(subtasksExample);
  
  helpContainer.appendChild(contentDiv);
  
  // Get the HTML content as a string
  const helpContent = helpContainer.innerHTML;
  
  // Create popup container
  const popupContainer = document.createElement('div');
  popupContainer.className = 'markdown-help-popup';
  popupContainer.innerHTML = helpContent;
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'close-popup-btn';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    popupContainer.remove();
  });
  
  popupContainer.insertBefore(closeButton, popupContainer.firstChild);
  
  // Add to document
  document.body.appendChild(popupContainer);
  
  // Close when clicking outside
  popupContainer.addEventListener('click', (e) => {
    if (e.target === popupContainer) {
      popupContainer.remove();
    }
  });
}

/**
 * Extract board data from the current DOM structure
 * @returns {Array} Array of column objects with their cards
 */
function getBoardDataFromDOM() {
  const columns = [];
  
  // Get all column elements
  const columnElements = document.querySelectorAll('.kanban-column');
  
  // Process each column
  columnElements.forEach(columnElement => {
    const columnTitle = columnElement.querySelector('.column-header').textContent;
    const cards = [];
    
    // Get all card elements in this column
    const cardElements = columnElement.querySelectorAll('.kanban-card');
    
    // Process each card
    cardElements.forEach(cardElement => {
      const cardTextElement = cardElement.querySelector('.card-text');
      // Get inner text, or for formatted cards, get the original card text from dataset
      const cardText = cardTextElement.dataset.originalText || cardTextElement.textContent;
      const isCompleted = cardElement.querySelector('.task-checkbox').checked;
      
      // Extract subtasks if any
      const subtasks = [];
      const subtaskElements = cardElement.querySelectorAll('.subtask');
      subtaskElements.forEach(subtaskElement => {
        const subtaskText = subtaskElement.querySelector('.subtask-text').textContent;
        const isSubtaskCompleted = subtaskElement.querySelector('.subtask-checkbox').checked;
        
        // Extract indentation from style
        let indentation = 1; // Default
        const marginLeft = subtaskElement.style.marginLeft;
        if (marginLeft) {
          // Convert "10px" to 1, "20px" to 2, etc.
          indentation = parseInt(marginLeft) / 10;
        }
        
        subtasks.push({
          text: subtaskText,
          completed: isSubtaskCompleted,
          indentation: indentation
        });
      });
      
      // Extract card metadata
      let priority = null;
      let dueDate = null;
      let tags = [];
      
      // Check for priority element
      const priorityElement = cardElement.querySelector('.priority');
      if (priorityElement) {
        priority = priorityElement.textContent.toLowerCase();
      }
      
      // Check for due date element
      const dueDateElement = cardElement.querySelector('.due-date');
      if (dueDateElement) {
        const dueDateMatch = dueDateElement.textContent.match(/Due: (\d{4}-\d{2}-\d{2})/);
        if (dueDateMatch) {
          dueDate = dueDateMatch[1];
        }
      }
      
      // Check for tag elements
      const tagElements = cardElement.querySelectorAll('.tag');
      tagElements.forEach(tagElement => {
        // Remove the # from the tag text
        const tagText = tagElement.textContent.substring(1);
        tags.push(tagText);
      });
      
      // Get extended content if any
      let content = '';
      const contentElement = cardElement.querySelector('.card-extended-content');
      if (contentElement) {
        content = contentElement.innerText;
      }
      
      cards.push({
        text: cardText,
        completed: isCompleted,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        content: content || undefined,
        priority: priority,
        dueDate: dueDate,
        tags: tags.length > 0 ? tags : undefined
      });
    });
    
    columns.push({
      title: columnTitle,
      cards: cards
    });
  });
  
  // Return the columns array we've built
  return columns;
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
