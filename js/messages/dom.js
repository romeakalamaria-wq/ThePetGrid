const $=(s,p=document)=>p.querySelector(s); const $$=(s,p=document)=>[...p.querySelectorAll(s)];
export const dom={
 conversationList:$("#conversationList"),conversationsEmptyState:$("#conversationsEmptyState"),conversationSearchInput:$("#conversationSearchInput"),clearConversationSearch:$("#clearConversationSearch"),filterButtons:$$(".conversation-filter-btn"),
 chatEmptyState:$("#chatEmptyState"),activeChat:$("#activeChat"),chatUserAvatar:$("#chatUserAvatar"),chatUserPresence:$("#chatUserPresence"),chatUserName:$("#chatUserName"),chatUserStatus:$("#chatUserStatus"),
 messagesViewport:$("#messagesViewport"),messagesList:$("#messagesList"),scrollToLatestButton:$("#scrollToLatestButton"),
 messageComposerForm:$("#messageComposerForm"),messageInput:$("#messageInput"),sendMessageButton:$("#sendMessageButton"),messageInputCounter:$("#messageInputCounter"),
 emojiButton:$("#emojiButton"),emojiPicker:$("#emojiPicker"),closeEmojiPicker:$("#closeEmojiPicker"),emojiGrid:$("#emojiGrid"),
 attachmentButton:$("#attachmentButton"),attachmentInput:$("#attachmentInput"),attachmentPreview:$("#attachmentPreview"),attachmentPreviewImage:$("#attachmentPreviewImage"),attachmentPreviewName:$("#attachmentPreviewName"),attachmentPreviewSize:$("#attachmentPreviewSize"),removeAttachmentButton:$("#removeAttachmentButton"),
 typingIndicator:$("#typingIndicator"),typingIndicatorAvatar:$("#typingIndicatorAvatar"),typingUserName:$("#typingUserName"),
 detailsEmptyState:$("#detailsEmptyState"),detailsContent:$("#detailsContent"),detailsUserAvatar:$("#detailsUserAvatar"),detailsUserPresence:$("#detailsUserPresence"),detailsUserName:$("#detailsUserName"),detailsUsername:$("#detailsUsername"),detailsUserStatus:$("#detailsUserStatus"),detailsUserLocation:$("#detailsUserLocation"),viewProfileLink:$("#viewProfileLink"),
 newConversationButton:$("#newConversationButton"),emptyStateNewMessageButton:$("#emptyStateNewMessageButton"),newConversationModal:$("#newConversationModal"),closeNewConversationModal:$("#closeNewConversationModal"),newConversationUsersList:$("#newConversationUsersList"),newConversationSearchInput:$("#newConversationSearchInput"),newConversationEmptyState:$("#newConversationEmptyState")
};
export const qsa=$$;
