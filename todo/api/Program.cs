using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<TodoDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("TodoDb")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("AllowFrontend");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TodoDbContext>();
    db.Database.EnsureCreated();
}

static bool TryGetUserId(HttpRequest request, out int userId)
{
    userId = 0;
    if (!request.Headers.TryGetValue("X-User-Id", out var value))
    {
        return false;
    }

    return int.TryParse(value.ToString(), out userId);
}

app.MapPost("/api/auth/register", async (AuthRequest request, TodoDbContext db) =>
{
    var username = request.Username?.Trim();
    var password = request.Password?.Trim();

    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest("Username and password are required.");
    }

    var exists = await db.Users.AnyAsync(u => u.Username == username);
    if (exists)
    {
        return Results.Conflict("Username already exists.");
    }

    var user = new AppUser
    {
        Username = username,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        CreatedAt = DateTime.UtcNow
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created($"/api/users/{user.Id}", new AuthResponse(user.Id, user.Username));
});

app.MapPost("/api/auth/login", async (AuthRequest request, TodoDbContext db) =>
{
    var username = request.Username?.Trim();
    var password = request.Password?.Trim();

    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest("Username and password are required.");
    }

    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
    if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new AuthResponse(user.Id, user.Username));
});

app.MapGet("/api/todos", async (HttpRequest request, TodoDbContext db) =>
{
    if (!TryGetUserId(request, out var userId))
    {
        return Results.Unauthorized();
    }

    var items = await db.Todos.AsNoTracking()
        .Where(t => t.UserId == userId)
        .OrderBy(t => t.IsDone)
        .ThenByDescending(t => t.CreatedAt)
        .ToListAsync();

    return Results.Ok(items);
});

app.MapGet("/api/todos/{id:int}", async (int id, HttpRequest request, TodoDbContext db) =>
{
    if (!TryGetUserId(request, out var userId))
    {
        return Results.Unauthorized();
    }

    var item = await db.Todos.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

app.MapPost("/api/todos", async (CreateTodoRequest request, HttpRequest httpRequest, TodoDbContext db) =>
{
    if (!TryGetUserId(httpRequest, out var userId))
    {
        return Results.Unauthorized();
    }

    var title = request.Title?.Trim();
    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.BadRequest("Title is required.");
    }

    var item = new TodoItem
    {
        UserId = userId,
        Title = title,
        IsDone = false,
        CreatedAt = DateTime.UtcNow,
        DueAt = request.DueAt
    };

    db.Todos.Add(item);
    await db.SaveChangesAsync();

    return Results.Created($"/api/todos/{item.Id}", item);
});

app.MapPut("/api/todos/{id:int}", async (int id, UpdateTodoRequest request, HttpRequest httpRequest, TodoDbContext db) =>
{
    if (!TryGetUserId(httpRequest, out var userId))
    {
        return Results.Unauthorized();
    }

    var item = await db.Todos.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (item is null)
    {
        return Results.NotFound();
    }

    if (!string.IsNullOrWhiteSpace(request.Title))
    {
        item.Title = request.Title.Trim();
    }

    if (request.IsDone is not null)
    {
        item.IsDone = request.IsDone.Value;
    }

    if (request.DueAt is not null)
    {
        item.DueAt = request.DueAt;
    }

    await db.SaveChangesAsync();
    return Results.Ok(item);
});

app.MapDelete("/api/todos/{id:int}", async (int id, HttpRequest httpRequest, TodoDbContext db) =>
{
    if (!TryGetUserId(httpRequest, out var userId))
    {
        return Results.Unauthorized();
    }

    var item = await db.Todos.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (item is null)
    {
        return Results.NotFound();
    }

    db.Todos.Remove(item);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

record CreateTodoRequest(string Title, DateTime? DueAt);

record UpdateTodoRequest(string? Title, bool? IsDone, DateTime? DueAt);

record AuthRequest(string Username, string Password);

record AuthResponse(int UserId, string Username);
