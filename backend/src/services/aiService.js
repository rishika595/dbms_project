const OpenAI = require("openai");

const buildFallbackResponse = (aiStatus, message) => ({
  source: "fallback",
  aiStatus,
  ...(message ? { message } : {}),
  suggestedModality: "tabular",
  suggestedTaskType: "classification",
  suggestedTags: [],
  shortSummary: "Basic dataset analysis",
  qualityWarnings: []
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestedModality: {
      type: "string"
    },
    suggestedTaskType: {
      type: "string"
    },
    suggestedTags: {
      type: "array",
      items: {
        type: "string"
      }
    },
    shortSummary: {
      type: "string"
    },
    qualityWarnings: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "suggestedModality",
    "suggestedTaskType",
    "suggestedTags",
    "shortSummary",
    "qualityWarnings"
  ]
};

const buildPrompt = ({ dataset, csvAnalysis }) => {
  const metadata = dataset.metadata || {};

  return [
    "You are helping classify a machine learning dataset.",
    "",
    "Given:",
    `- dataset title: ${dataset.title || ""}`,
    `- dataset description: ${dataset.description || ""}`,
    `- headers: ${JSON.stringify(csvAnalysis.headers || [])}`,
    `- sample rows: ${JSON.stringify(csvAnalysis.sampleRows || [])}`,
    `- row count: ${csvAnalysis.rows}`,
    `- column count: ${csvAnalysis.columns}`,
    `- delimiter: ${csvAnalysis.delimiter || ""}`,
    `- current metadata: ${JSON.stringify({
      versionId: metadata.versionId || null,
      versionNumber: metadata.versionNumber || null,
      numRows: metadata.numRows || null,
      numColumns: metadata.numColumns || null,
      encoding: metadata.encoding || null,
      delimiter: metadata.delimiter || null,
      columnInfo: metadata.columnInfo || null,
      language: metadata.language || null,
      updateFrequency: metadata.updateFrequency || null,
      sourceOrigin: metadata.sourceOrigin || null
    })}`,
    "",
    "Return STRICT JSON with these keys only:",
    "- suggestedModality",
    "- suggestedTaskType",
    "- suggestedTags",
    "- shortSummary",
    "- qualityWarnings",
    "",
    "Rules:",
    "- suggestedModality should usually be one of: tabular, text, image, audio, mixed",
    "- suggestedTaskType should usually be one of: classification, regression, clustering, time-series, recommendation, NLP, unknown",
    "- suggestedTags must be an array of short strings",
    "- shortSummary must be 1-2 sentences",
    "- qualityWarnings must be an array of short strings",
    "- return valid JSON only, no markdown"
  ].join("\n");
};

const normalizeAiResult = (result) => ({
  source: "ai",
  aiStatus: "ai_success",
  suggestedModality: typeof result.suggestedModality === "string" ? result.suggestedModality : "tabular",
  suggestedTaskType: typeof result.suggestedTaskType === "string" ? result.suggestedTaskType : "classification",
  suggestedTags: Array.isArray(result.suggestedTags)
    ? result.suggestedTags.filter((tag) => typeof tag === "string")
    : [],
  shortSummary:
    typeof result.shortSummary === "string" && result.shortSummary.trim()
      ? result.shortSummary
      : "Basic dataset analysis",
  qualityWarnings: Array.isArray(result.qualityWarnings)
    ? result.qualityWarnings.filter((warning) => typeof warning === "string")
    : []
});

const mapOpenAiFailure = (error) => {
  const status = error?.status;
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  if (status === 401 || status === 403 || code.includes("authentication")) {
    return {
      aiStatus: "api_key_invalid",
      message: "OpenAI authentication failed"
    };
  }

  if (
    status === 400 &&
    (message.includes("model") || code.includes("model") || code.includes("not_found_error"))
  ) {
    return {
      aiStatus: "model_invalid",
      message: "Invalid AI model configured"
    };
  }

  return {
    aiStatus: "openai_request_failed",
    message: "AI request failed"
  };
};

const suggestMetadataWithAi = async ({ dataset, csvAnalysis }) => {
  if (!process.env.OPENAI_API_KEY) {
    console.log("AI metadata fallback used", {
      reason: "OPENAI_API_KEY missing"
    });
    return buildFallbackResponse("api_key_missing", "OPENAI_API_KEY not configured");
  }

  try {
    console.log("AI metadata call starting", {
      datasetId: dataset.id,
      model: process.env.AI_MODEL || "gpt-4o-mini"
    });

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPrompt({ dataset, csvAnalysis })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dataset_metadata_suggestion",
          strict: true,
          schema: responseSchema
        }
      }
    });

    const parsed = JSON.parse(response.output_text);
    console.log("AI metadata call succeeded", {
      datasetId: dataset.id
    });
    return normalizeAiResult(parsed);
  } catch (error) {
    const failure = mapOpenAiFailure(error);
    console.error("AI metadata suggestion failed", {
      datasetId: dataset.id,
      aiStatus: failure.aiStatus,
      errorMessage: error.message
    });
    console.log("AI metadata fallback used", {
      datasetId: dataset.id,
      reason: failure.aiStatus
    });
    return buildFallbackResponse(failure.aiStatus, failure.message);
  }
};

module.exports = {
  suggestMetadataWithAi,
  buildFallbackResponse
};
