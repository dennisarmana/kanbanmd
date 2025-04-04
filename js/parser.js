/**
 * Markdown parser for Kanban.md Web Tool
 * Converts markdown text to a structured kanban board data format
 * 
 * Enhanced to support:
 * - Nested lists (subtasks)
 * - Links and formatting within cards
 * - Card metadata (tags, dates, priorities)
 * - Multiline card content
 */

/**
 * Parse markdown content into kanban board structure
 * @param {string} markdown - Markdown content to parse
 * @returns {Array} Array of column objects with their cards
 */
function parseMarkdown(markdown) {
  // Split the markdown content by lines
  const lines = markdown.split('\n');
  const columns = [];
  let currentColumn = null;
  let currentCard = null;
  let inCodeBlock = false;
  let indentationLevel = 0;
  
  // Check if the line is inside a code block (to avoid parsing markdown syntax inside code blocks)
  const toggleCodeBlock = (line) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return true;
    }
    return false;
  };
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle code blocks specially
    if (toggleCodeBlock(line)) {
      // If we're processing a card, add the code block marker to the content
      if (currentCard) {
        currentCard.content += line + '\n';
      }
      continue;
    }
    
    // Skip empty lines or metadata lines when not inside a card
    if ((!trimmedLine || trimmedLine.startsWith('---') || trimmedLine.startsWith('%')) && 
        !currentCard) {
      continue;
    }
    
    // Inside a code block, just add content without parsing
    if (inCodeBlock && currentCard) {
      currentCard.content += line + '\n';
      continue;
    }
    
    // Check if line is a heading (column) - This is the main column detection logic
    if (trimmedLine.startsWith('##')) {
      // If we were processing a card, finalize it before moving to new column
      currentCard = null;
      
      const columnTitle = trimmedLine.replace(/^##\s+/, '').trim();
      currentColumn = {
        title: columnTitle,
        cards: []
      };
      columns.push(currentColumn);
      console.log(`Detected column: ${columnTitle}`); // Debug log
    } 
    // Check if line is a list item (card)
    else if (trimmedLine.startsWith('-') && currentColumn) {
      // Calculate indentation level for nested lists
      const leadingSpaces = line.search(/\S/);
      indentationLevel = Math.floor(leadingSpaces / 2); // Assuming 2-space indentation
      
      // Extract task content and check status
      let cardText = trimmedLine.substring(1).trim();
      let isCompleted = false;
      let tags = [];
      let dueDate = null;
      let priority = null;
      
      // Check for checkbox syntax
      if (cardText.startsWith('[ ]')) {
        cardText = cardText.substring(3).trim();
        isCompleted = false;
      } else if (cardText.startsWith('[x]') || cardText.startsWith('[X]')) {
        cardText = cardText.substring(3).trim();
        isCompleted = true;
      }
      
      // Extract tags - format #tag
      const tagRegex = /#([\w-]+)/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(cardText)) !== null) {
        tags.push(tagMatch[1]);
      }
      
      // Extract due date - format @due(YYYY-MM-DD)
      const dueDateRegex = /@due\((\d{4}-\d{2}-\d{2})\)/;
      const dueDateMatch = cardText.match(dueDateRegex);
      if (dueDateMatch) {
        dueDate = dueDateMatch[1];
        // Remove the due date marker from the text
        cardText = cardText.replace(dueDateRegex, '').trim();
      }
      
      // Extract priority - format !priority
      const priorityRegex = /!(high|medium|low)/i;
      const priorityMatch = cardText.match(priorityRegex);
      if (priorityMatch) {
        priority = priorityMatch[1].toLowerCase();
        // Remove the priority marker from the text
        cardText = cardText.replace(priorityRegex, '').trim();
      }
      
      // Create the new card
      const card = {
        text: cardText,
        completed: isCompleted,
        indentation: indentationLevel,
        content: '', // For multiline content
        subtasks: [],
        tags: tags,
        dueDate: dueDate,
        priority: priority,
        links: extractLinks(cardText) // Extract links from the card text
      };
      
      // Add card to current column
      currentColumn.cards.push(card);
      
      // Set this as the current card for potential content/subtasks
      currentCard = card;
      
      // Debug log
      console.log(`Added card '${cardText.substring(0, 30)}${cardText.length > 30 ? '...' : ''}' to column '${currentColumn.title}'`);
    }
    // Check if line is a nested/continued content for current card
    else if (currentColumn && currentCard) {
      // If line is indented and starts with a list marker, it's a subtask
      if (trimmedLine.startsWith('-')) {
        const leadingSpaces = line.search(/\S/);
        const subtaskIndent = Math.floor(leadingSpaces / 2); // Assuming 2-space indentation
        
        // Only process as subtask if it's more indented than the parent
        if (subtaskIndent > indentationLevel) {
          // Extract subtask content and status
          let subtaskText = trimmedLine.substring(1).trim();
          let isSubtaskCompleted = false;
          
          // Check for checkbox syntax in subtask
          if (subtaskText.startsWith('[ ]')) {
            subtaskText = subtaskText.substring(3).trim();
            isSubtaskCompleted = false;
          } else if (subtaskText.startsWith('[x]') || subtaskText.startsWith('[X]')) {
            subtaskText = subtaskText.substring(3).trim();
            isSubtaskCompleted = true;
          }
          
          // Add subtask to current card
          currentCard.subtasks.push({
            text: subtaskText,
            completed: isSubtaskCompleted,
            indentation: subtaskIndent - indentationLevel
          });
          continue;
        }
      }
      
      // Check if this is the start of a new card
      if (trimmedLine.startsWith('-') && 
          (trimmedLine.includes('[ ]') || trimmedLine.includes('[x]') || 
           trimmedLine.includes('[X]'))) {
        // This is a new card, so process it
        i--; // Back up to reprocess this line as a new card
        currentCard = null; // Reset the current card
        continue;
      }
      
      // Add this line as continued content to the current card
      currentCard.content += line + '\n';
    }
  }
  
  // Clean up the card content - trim trailing newlines
  columns.forEach(column => {
    column.cards.forEach(card => {
      card.content = card.content.trim();
    });
  });
  
  // Validate we have at least one column
  if (columns.length === 0) {
    throw new Error('No valid kanban columns found in the markdown file');
  }
  
  return columns;
}

/**
 * Extract links from text
 * @param {string} text - Text to extract links from
 * @returns {Array} Array of link objects with href and text properties
 */
function extractLinks(text) {
  const links = [];
  
  // Match markdown links [text](url)
  const markdownLinkRegex = /\[([^\[\]]+)\]\(([^\(\)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    links.push({
      text: match[1],
      href: match[2]
    });
  }
  
  // Match bare URLs
  const urlRegex = /(?<!\()https?:\/\/[^\s\)]+/g;
  while ((match = urlRegex.exec(text)) !== null) {
    // Only add if not already part of a markdown link
    const url = match[0];
    if (!links.some(link => link.href === url)) {
      links.push({
        text: url,
        href: url
      });
    }
  }
  
  return links;
}

/**
 * Convert kanban board data back to markdown
 * @param {Array} columns - Array of column objects with their cards
 * @returns {string} Markdown representation of the kanban board
 */
function generateMarkdown(columns) {
  let markdown = '---\n\nkanban-plugin: board\n\n---\n\n';
  
  // Process each column
  columns.forEach(column => {
    markdown += `## ${column.title}\n\n`;
    
    // Process each card in the column
    column.cards.forEach(card => {
      // Create indentation based on nesting level
      const indentation = '  '.repeat(card.indentation || 0);
      const checkbox = card.completed ? '[x]' : '[ ]';
      
      // Start with the basic card text
      let cardLine = `${indentation}- ${checkbox} ${card.text}`;
      
      // Add metadata if present
      if (card.priority) {
        cardLine += ` !${card.priority}`;
      }
      
      if (card.dueDate) {
        cardLine += ` @due(${card.dueDate})`;
      }
      
      // Add tags
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tag => {
          // Only add if the tag isn't already in the text
          if (!cardLine.includes(`#${tag}`)) {
            cardLine += ` #${tag}`;
          }
        });
      }
      
      markdown += `${cardLine}\n`;
      
      // Add multiline content if present
      if (card.content) {
        // Split content into lines and apply indentation
        const contentLines = card.content.split('\n');
        contentLines.forEach(line => {
          markdown += `${indentation}  ${line}\n`;
        });
      }
      
      // Add subtasks if present
      if (card.subtasks && card.subtasks.length > 0) {
        card.subtasks.forEach(subtask => {
          const subtaskIndent = '  '.repeat((card.indentation || 0) + 
                                           (subtask.indentation || 1));
          const subtaskCheckbox = subtask.completed ? '[x]' : '[ ]';
          markdown += `${subtaskIndent}- ${subtaskCheckbox} ${subtask.text}\n`;
        });
      }
      
      // Add an extra newline after each card for readability
      markdown += '\n';
    });
    
    markdown += '\n';
  });
  
  // Add settings section for compatibility
  markdown += '%% kanban:settings\n```\n{"kanban-plugin":"board"}\n```\n%%\n';
  
  return markdown;
}

/**
 * Format card text with markdown formatting
 * @param {string} text - Raw card text
 * @returns {string} HTML formatted text
 */
function formatCardText(text) {
  if (!text) return '';
  
  // Replace markdown links with HTML links
  text = text.replace(/\[([^\[\]]+)\]\(([^\(\)]+)\)/g, 
                     '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Replace bare URLs with HTML links
  text = text.replace(/(?<!\()https?:\/\/[^\s\)]+/g, 
                     '<a href="$&" target="_blank" rel="noopener">$&</a>');
  
  // Bold text
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic text
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Highlight tags
  text = text.replace(/#([\w-]+)/g, '<span class="tag">$&</span>');
  
  return text;
}
