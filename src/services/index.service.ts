class IndexService {
    private static instance: IndexService;

    private constructor() {}

    public static getInstance(): IndexService {
        if (!IndexService.instance) {
            IndexService.instance = new IndexService();
        }
        return IndexService.instance;
    }

    public async getIndexData(): Promise<string> {
        return 'Welcome to the URL Shortener API';
    }
}

export default IndexService.getInstance();
