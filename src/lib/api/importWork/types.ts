export interface ImportedWorkData {
    title?: string;
    cover?: string;
    genres?: string[];
    author?: string;
    studio?: string;
    publisher?: string;
    isbn?: string;
    artist?: string;
    album?: string;
    country?: string;
    totalEpisodes?: number;
    totalChapters?: number;
    totalVolumes?: number;
    totalPages?: number;
    totalIssues?: number;
    totalSeasons?: number;
    durationMinutes?: number;
    episodeDurationMinutes?: number;
    releaseYear?: number;
    platform?: string;
    fandoms?: string[];
    language?: string[];
    wordCount?: number;
    synopsis?: string;
    tags?: string[];
}

export interface ImportResult {
    ok: boolean;
    error?: string;
    warning?: string;
    source?: string;
    data?: ImportedWorkData;
}