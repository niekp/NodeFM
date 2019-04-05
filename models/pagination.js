module.exports = {
    recordCount: 0,
    limit: 20,
    offset: 0,
    pages: [],
    totalPages: 0,
    current: 1,
    next: null,
    previous: null,
    range: 9,
    filter: null,

    /**
     * Reset the default parameters
     */
    resetDefault: function () {
        this.recordCount = 0;
        this.limit = 20;
        this.offset = 0;
        this.pages = [];
        this.totalPages = 0;
        this.current = 1;
        this.next = null;
        this.previous = null;
    },

    /**
     * Calculate the pagination properties. Uses the {page} and {limit} GET parameters.
     * It can be called without `recordCount` to access the `limit` and `offset` but for the pagination `recordCount` is needed.
     * 
     * @param {Request} req 
     */
    calculate: function(req) {
        // Set the query pagination parameters
        if (req.query.page)
            this.current = parseInt(req.query.page);

        // Optionally set the limit. Else the default is used
        if (req.query.limit)
            this.limit = parseInt(req.query.limit);

        this.filter = req.query.filter;

        // Calculate the pagecount
        if (this.recordCount > 0 && this.limit > 0)
            this.totalPages = Math.ceil(this.recordCount / this.limit);

        // Set the default and current page numbers
        if ((this.current + 1) <= this.totalPages)
            this.next = this.current + 1;

        if (this.current > 1)
            this.previous = this.current - 1;

        // Calculate the record offset for sql
        this.offset = (this.current - 1) * this.limit;

        // Start with the current page - 2
        let rangeStart = this.current - 2;
        if (rangeStart < 1)
            rangeStart = 1;
        
        // Set the end of the range and check if its within bounds
        let rangeEnd = rangeStart + this.range;

        if (rangeEnd > this.totalPages)
            rangeEnd = this.totalPages;
        
        // If there are less pages then the wanted range (because you are on the last few pages) shift the startpage
        if (Math.abs(rangeEnd - rangeStart) !== this.range)
            rangeStart -= Math.abs(rangeEnd - rangeStart - this.range);

        // Check again
        if (rangeStart < 1)
            rangeStart = 1;
        
        // Build an array of wanted pagenumbers.
        this.pages = [];
        for (var i = rangeStart; i <= rangeEnd; i++) {
            this.pages.push(i);
        }
    },

    getUrl: function(page) {
        let filterString = '';
        if (this.filter)
            filterString = '&' + Object.keys(this.filter).map(key => "filter[" + key + "]" + '=' + this.filter[key]).join('&');

        return '?limit=' + this.limit + '&page=' + page + filterString
    }

}

