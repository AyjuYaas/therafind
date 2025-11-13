import ReactLoading from "react-loading";
import { FaAngleDoubleDown } from "react-icons/fa";
import { format } from "date-fns";
import { JSX, useEffect, useRef, useState } from "react";
import { useMessageStore } from "../../../../store/useMessageStore";
import { useParams } from "react-router-dom";
import { HiDocumentRemove } from "react-icons/hi";
import { BsFileEarmarkPdfFill } from "react-icons/bs";
import PreviewPDF from "./PreviewPDF";
import { MdDelete } from "react-icons/md";
import ConfirmDeletePrompt from "./ConfirmDeletePrompt";

interface PDF {
  src: string;
  name: string;
}

interface DocumentDelete {
  id: string;
  name: string;
}

const Documents = (): JSX.Element => {
  const {
    getDocuments,
    documents,
    loadingDocuments,
    hasMoreDocument,
    sentDocument,
  } = useMessageStore();

  const [loadMore, setLoadMore] = useState<number>(1);
  const { id } = useParams<{ id?: string }>();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [openPdf, setOpenPdf] = useState<PDF | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);

  const [deleteDocument, setDeleteDocument] = useState<DocumentDelete | null>(
    null
  );

  // Fetch messages on mount and when loadMore changes
  useEffect(() => {
    if (id && hasMoreDocument) {
      getDocuments(id, useMessageStore.getState().cursor);
    }
  }, [getDocuments, hasMoreDocument, id, loadMore]);

  // Smooth scroll to the bottom
  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // Scroll to bottom on initial load and message sent
  useEffect(() => {
    if (loadMore === 1) scrollToBottom(false);
    if (!showScrollButton) scrollToBottom(true);
  }, [documents, loadMore, showScrollButton]);

  useEffect(() => {
    scrollToBottom(true); // Smooth scroll on message sent
  }, [sentDocument]);

  // Handle scroll events
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;

      // Show scroll button when not at the bottom
      setShowScrollButton(
        container.scrollHeight - container.scrollTop >
          container.clientHeight + 100
      );

      // Load more messages when scrolled to the top
      if (container.scrollTop === 0 && hasMoreDocument && !loadingDocuments) {
        const previousScrollHeight = container.scrollHeight;
        setLoadMore((prev) => prev + 1);

        // Preserve scroll position after fetching
        const observer = new MutationObserver(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
          observer.disconnect();
        });
        observer.observe(container, { childList: true, subtree: true });
      }
    }
  };

  const handlePdfClick = (pdfUrl: string, fileName: string) => {
    setOpenPdf({ src: pdfUrl, name: fileName }); // Set the PDF URL to open
  };

  const closePdfPreview = () => {
    setOpenPdf(null);
  };

  return (
    <div
      className="h-full min-h-40 flex flex-col overflow-y-auto scrollbar pb-2 pr-2 w-full"
      ref={messagesContainerRef}
      onScroll={handleScroll}
    >
      {/* Loading Spinner on Initial Load */}
      {loadingDocuments && loadMore === 1 ? (
        <div className="self-center my-auto flex flex-col gap-2 items-center justify-center">
          <ReactLoading type="spin" color="#303b36" />
          <span className="text-sm">Loading Documents, please wait...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="self-center my-auto flex flex-col gap-2 items-center justify-center text-xl">
          <HiDocumentRemove className="text-4xl text-main-text" />
          <span>No Shared Documents yet.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          {documents.map((document, index: number) => (
            <div
              key={index}
              className={`flex rounded-2xl bg-[#545b74] text-white cursor-pointer relative justify-between w-full`}
            >
              <div
                className="p-2 px-4 flex flex-col gap-2  hover:bg-[#816d89] w-full rounded-l-2xl"
                onClick={() =>
                  handlePdfClick(document.document, document.fileName)
                }
              >
                <div className="flex items-center gap-2 w-full">
                  <div>
                    <BsFileEarmarkPdfFill className="size-5 text-red-400" />
                  </div>

                  {/* Text Message */}
                  {document.fileName ? (
                    <span
                      className={`rounded-xl max-w-40 text-base break-words`}
                    >
                      {document.fileName}
                    </span>
                  ) : (
                    <span>document.pdf</span>
                  )}
                </div>

                {document.description && (
                  <span className="text-xs line-clamp-3">
                    {document.description}
                  </span>
                )}
                {/* Message Timestamp */}
                <span className="text-[0.7rem]">
                  {format(new Date(document.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>

              <button
                className="rounded-r-2xl bg-red-600 right-0 top-0 my-auto h-full p-2 hover:bg-red-500 w-10 cursor-pointer "
                onClick={() =>
                  setDeleteDocument({
                    id: document._id,
                    name: document.fileName,
                  })
                }
              >
                <MdDelete />
              </button>
            </div>
          ))}
          {/* Scroll to Bottom Button */}

          {showScrollButton && (
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-10 left-1/2 transform -translate-1/2 p-2 bg-[#006e5e] text-white rounded-full shadow-lg hover:bg-[#1c2f3b] transition duration-300 z-10 cursor-pointer"
            >
              <FaAngleDoubleDown size={19} />
            </button>
          )}
        </div>
      )}

      {openPdf && (
        <PreviewPDF
          src={openPdf.src}
          onClose={closePdfPreview}
          name={openPdf.name}
        />
      )}

      {deleteDocument && (
        <ConfirmDeletePrompt
          id={deleteDocument.id}
          toggleRemoveOption={() => setDeleteDocument(null)}
          name={deleteDocument.name || ""}
        />
      )}
    </div>
  );
};

export default Documents;
